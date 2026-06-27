import type { InjectionKey } from 'vue';
import type { Unsubscribable } from '@graphiql/toolkit';
import type { GraphQLSchema, DocumentNode, OperationDefinitionNode } from 'graphql';
import type { GraphiQLStore, GraphiQLPlugin, TabState, GraphiQLProps } from '@/src/types';

import { ref, shallowRef, computed, watch, markRaw } from 'vue';
import { createGraphiQLFetcher, fillLeafs, mergeAst } from '@graphiql/toolkit';

import {
    parse,
    print,
    debounce,
    createTab,
    parseJsonc,
    formatError,
    formatResult,
    createStorage,
    introspectSchema,
    getOperationFacts,
    serializeTabState,
    deserializeTabState,
    getSelectedOperationName,
} from '@/src/utils';

export function createGraphiQLStore(props: GraphiQLProps): GraphiQLStore {
    const namespace = props.namespace ?? '';
    const defaultQuery =
        props.defaultQuery ??
        '# Welcome to GraphiQL\n#\n# Start typing a query, or use the Explorer\n# to build one by clicking fields.\n\n';
    const isHeadersEditorEnabled = props.isHeadersEditorEnabled ?? false;

    // Storage
    const storage = createStorage(namespace);

    // Fetcher
    const fetcher = createGraphiQLFetcher({ url: props.url });

    // Instance ID for Monaco URIs
    const instanceId = `graphiql-${Date.now()}-`;

    // ---- Schema state ----
    const schema = shallowRef<GraphQLSchema | null>(null);
    const isIntrospecting = ref(false);
    const fetchError = ref<string | null>(null);
    const validationErrors = ref<readonly import('graphql').GraphQLError[]>([]);

    // ---- Tab state ----
    const initialQuery = props.initialQuery ?? storage.get('query') ?? defaultQuery;
    const initialVariables = storage.get('variables') ?? '';
    const initialHeaders = storage.get('headers') ?? '';

    // Try to restore tabs from storage
    let restoredTabs: TabState[] | null = null;
    let restoredActiveIndex = 0;
    const savedTabState = storage.get('tabState');
    if (savedTabState) {
        const restored = deserializeTabState(savedTabState);
        if (restored && restored.tabs.length > 0) {
            restoredTabs = restored.tabs;
            restoredActiveIndex = Math.min(
                restored.activeTabIndex,
                restored.tabs.length - 1
            );
        }
    }

    const tabs = ref<TabState[]>(
        restoredTabs ?? [
            createTab({
                query: initialQuery,
                variables: initialVariables,
                headers: initialHeaders,
            }),
        ]
    );
    const activeTabIndex = ref(restoredActiveIndex);
    const activeTab = computed(() => tabs.value[activeTabIndex.value]);

    // ---- Execution state ----
    const isFetching = ref(false);
    const subscription = shallowRef<Unsubscribable | null>(null);
    let queryId = 0;

    // ---- Plugin state ----
    const plugins = ref<GraphiQLPlugin[]>([]);
    const visiblePlugin = ref<GraphiQLPlugin | null>(null);

    // ---- Theme ----
    const theme = ref<'light' | 'dark'>(props.theme ?? 'light');

    // ---- Settings ----
    const shouldPersistHeaders = ref(storage.get('shouldPersistHeaders') === 'true');

    // ---- Operation facts ----
    const documentAST = shallowRef<DocumentNode | null>(null);
    const operationName = ref<string | null>(null);
    const operations = shallowRef<OperationDefinitionNode[]>([]);

    // ---- Editor instances ----
    const editors: GraphiQLStore['editors'] = {
        query: null,
        variable: null,
        header: null,
        response: null,
    };

    // ---- Debounced storage ----
    const debouncedStoreTabs = debounce(() => {
        storage.set(
            'tabState',
            serializeTabState(
                tabs.value,
                activeTabIndex.value,
                shouldPersistHeaders.value
            )
        );
    }, 500);

    // ---- Actions ----

    function updateOperationFacts() {
        const tab = tabs.value[activeTabIndex.value];
        if (!tab) return;
        const facts = getOperationFacts(tab.query);
        if (facts) {
            documentAST.value = markRaw(facts.documentAST);
            const newOpName = getSelectedOperationName(
                operations.value,
                operationName.value,
                facts.operations
            );
            operationName.value = newOpName;
            operations.value = facts.operations;
        }
    }

    async function introspect() {
        if (isIntrospecting.value) return;
        isIntrospecting.value = true;
        fetchError.value = null;
        try {
            const result = await introspectSchema(fetcher);
            schema.value = markRaw(result);

            // Validate current query against schema
            const tab = tabs.value[activeTabIndex.value];
            if (tab?.query && schema.value) {
                try {
                    const doc = parse(tab.query);
                    const errors = (await import('graphql')).validate(schema.value, doc);
                    validationErrors.value = errors;
                } catch {
                    // parse error - ignore
                }
            }
        } catch (err) {
            fetchError.value = err instanceof Error ? err.message : String(err);
        } finally {
            isIntrospecting.value = false;
        }
    }

    async function run(overrideOperationName?: string) {
        // If subscription active, toggle stop
        if (subscription.value) {
            stop();
            return;
        }

        const tab = tabs.value[activeTabIndex.value];
        if (!tab) return;

        let queryStr = tab.query;
        if (!queryStr?.trim()) return;

        // Fill leaf selections
        if (schema.value) {
            const filled = fillLeafs(schema.value, queryStr);
            if (filled?.result) {
                queryStr = filled.result;
                setEditorValue('query', queryStr);
            }
        }

        // Parse variables and headers
        let variables: Record<string, any> | undefined;
        let headers: Record<string, any> | undefined;

        try {
            variables = parseJsonc(tab.variables);
        } catch (err) {
            setResponseValue(
                formatError(
                    new Error(`Variables are invalid JSON: ${(err as Error).message}`)
                )
            );
            return;
        }

        try {
            headers = parseJsonc(tab.headers);
        } catch (err) {
            setResponseValue(
                formatError(
                    new Error(`Headers are invalid JSON: ${(err as Error).message}`)
                )
            );
            return;
        }

        const opName = overrideOperationName ?? operationName.value ?? undefined;
        const currentQueryId = ++queryId;
        isFetching.value = true;

        try {
            const result = fetcher(
                { query: queryStr, variables, operationName: opName },
                { headers, documentAST: documentAST.value ?? undefined }
            );

            // Handle Promise
            if (result && typeof (result as any).then === 'function') {
                const data = await result;

                // Check for async iterable (subscription/stream)
                if (data && typeof (data as any)[Symbol.asyncIterator] === 'function') {
                    handleAsyncIterable(data as AsyncIterable<any>, currentQueryId);
                    return;
                }

                // Check for observable
                if (data && typeof (data as any).subscribe === 'function') {
                    handleObservable(data as any, currentQueryId);
                    return;
                }

                if (currentQueryId !== queryId) return;
                handleResult(data);
                isFetching.value = false;
                return;
            }

            // Handle AsyncIterable directly
            if (result && typeof (result as any)[Symbol.asyncIterator] === 'function') {
                handleAsyncIterable(result as AsyncIterable<any>, currentQueryId);
                return;
            }

            // Handle Observable directly
            if (result && typeof (result as any).subscribe === 'function') {
                handleObservable(result as any, currentQueryId);
                return;
            }

            // Synchronous result
            if (currentQueryId !== queryId) return;
            handleResult(result);
            isFetching.value = false;
        } catch (err) {
            if (currentQueryId !== queryId) return;
            setResponseValue(formatError(err));
            isFetching.value = false;
        }
    }

    async function handleAsyncIterable(iterable: AsyncIterable<any>, qid: number) {
        const unsubscribable: Unsubscribable = {
            unsubscribe: () => {
                // Signal cancellation if the iterator supports it
                cancelled = true;
            },
        };
        subscription.value = unsubscribable;
        let cancelled = false;

        try {
            for await (const result of iterable) {
                if (cancelled || qid !== queryId) break;
                handleResult(result);
                isFetching.value = false;
            }
        } catch (err) {
            if (qid === queryId) {
                setResponseValue(formatError(err));
            }
        } finally {
            if (qid === queryId) {
                isFetching.value = false;
                subscription.value = null;
            }
        }
    }

    function handleObservable(observable: any, qid: number) {
        const sub = observable.subscribe({
            next: (result: any) => {
                if (qid !== queryId) return;
                handleResult(result);
                isFetching.value = false;
            },
            error: (err: any) => {
                if (qid !== queryId) return;
                setResponseValue(formatError(err));
                isFetching.value = false;
                subscription.value = null;
            },
            complete: () => {
                if (qid !== queryId) return;
                isFetching.value = false;
                subscription.value = null;
            },
        });
        subscription.value = sub;
    }

    function handleResult(result: any) {
        setResponseValue(formatResult(result));
        // Update tab response
        const tab = tabs.value[activeTabIndex.value];
        if (tab) {
            tab.response = formatResult(result);
            debouncedStoreTabs();
        }
    }

    function stop() {
        subscription.value?.unsubscribe();
        subscription.value = null;
        isFetching.value = false;
    }

    function addTab() {
        const newTab = createTab({
            query: defaultQuery,
            headers: shouldPersistHeaders.value
                ? (tabs.value[activeTabIndex.value]?.headers ?? '')
                : '',
        });
        tabs.value.push(newTab);
        activeTabIndex.value = tabs.value.length - 1;
        syncEditorsToTab();
        debouncedStoreTabs();
    }

    function closeTab(index: number) {
        if (tabs.value.length <= 1) return;
        // Stop any subscription on closing tab
        if (index === activeTabIndex.value && subscription.value) {
            stop();
        }
        tabs.value.splice(index, 1);
        if (activeTabIndex.value >= tabs.value.length) {
            activeTabIndex.value = tabs.value.length - 1;
        } else if (index < activeTabIndex.value) {
            activeTabIndex.value--;
        }
        syncEditorsToTab();
        debouncedStoreTabs();
    }

    function changeTab(index: number) {
        if (index === activeTabIndex.value) return;
        if (index < 0 || index >= tabs.value.length) return;
        // Save current editor values to the tab we're leaving
        saveCurrentEditorValues();
        if (subscription.value) stop();
        activeTabIndex.value = index;
        syncEditorsToTab();
        debouncedStoreTabs();
    }

    function saveCurrentEditorValues() {
        const tab = tabs.value[activeTabIndex.value];
        if (!tab) return;
        if (editors.query) tab.query = editors.query.getValue();
        if (editors.variable) tab.variables = editors.variable.getValue();
        if (editors.header) tab.headers = editors.header.getValue();
    }

    function syncEditorsToTab() {
        const tab = tabs.value[activeTabIndex.value];
        if (!tab) return;
        if (editors.query && editors.query.getValue() !== tab.query) {
            editors.query.setValue(tab.query);
        }
        if (editors.variable && editors.variable.getValue() !== tab.variables) {
            editors.variable.setValue(tab.variables);
        }
        if (editors.header && editors.header.getValue() !== tab.headers) {
            editors.header.setValue(tab.headers);
        }
        if (editors.response) {
            editors.response.setValue(tab.response ?? '');
        }
        updateOperationFacts();
    }

    async function prettify() {
        const tab = tabs.value[activeTabIndex.value];
        if (!tab) return;

        // Prettify query using graphql's print
        if (tab.query?.trim()) {
            try {
                const doc = parse(tab.query);
                const pretty = print(doc);
                setEditorValue('query', pretty);
            } catch {
                // parse error - leave as-is
            }
        }

        // Prettify variables
        if (tab.variables?.trim()) {
            try {
                const obj = parseJsonc(tab.variables);
                setEditorValue('variable', JSON.stringify(obj, null, 2));
            } catch {
                // invalid json - leave as-is
            }
        }

        // Prettify headers
        if (tab.headers?.trim()) {
            try {
                const obj = parseJsonc(tab.headers);
                setEditorValue('header', JSON.stringify(obj, null, 2));
            } catch {
                // invalid json - leave as-is
            }
        }
    }

    function copyQuery() {
        const tab = tabs.value[activeTabIndex.value];
        if (tab?.query) {
            navigator.clipboard?.writeText(tab.query);
        }
    }

    async function mergeFragments() {
        const tab = tabs.value[activeTabIndex.value];
        if (!tab?.query?.trim()) return;
        try {
            const doc = parse(tab.query);
            const merged = mergeAst(doc, schema.value ?? undefined);
            setEditorValue('query', print(merged));
        } catch {
            // ignore errors
        }
    }

    function setTheme(newTheme: 'light' | 'dark') {
        theme.value = newTheme;
        storage.set('theme', newTheme);
    }

    function setVisiblePlugin(plugin: GraphiQLPlugin | null) {
        visiblePlugin.value = plugin;
        if (plugin) {
            storage.set('visiblePlugin', plugin.title);
        } else {
            storage.remove('visiblePlugin');
        }
    }

    function setEditorValue(which: 'query' | 'variable' | 'header', value: string) {
        const editorInstance = editors[which];
        if (editorInstance && editorInstance.getValue() !== value) {
            editorInstance.setValue(value);
        }
        // Also update the tab
        const tab = tabs.value[activeTabIndex.value];
        if (tab) {
            if (which === 'query') {
                tab.query = value;
                tab.title = value
                    ? getOperationFacts(value)?.operations[0]?.name?.value ||
                      tabs.value[activeTabIndex.value].title
                    : '<untitled>';
                updateOperationFacts();
                storage.set('query', value);
            } else if (which === 'variable') {
                tab.variables = value;
                storage.set('variables', value);
            } else if (which === 'header') {
                tab.headers = value;
                if (shouldPersistHeaders.value) {
                    storage.set('headers', value);
                }
            }
            debouncedStoreTabs();
        }
    }

    function getEditorValue(which: 'query' | 'variable' | 'header' | 'response'): string {
        const editorInstance = editors[which === 'response' ? 'response' : which];
        return editorInstance?.getValue() ?? '';
    }

    function setResponseValue(value: string) {
        if (editors.response) {
            editors.response.setValue(value);
        }
        const tab = tabs.value[activeTabIndex.value];
        if (tab) {
            tab.response = value;
        }
    }

    function storeTabs() {
        debouncedStoreTabs();
    }

    // ---- Restore visible plugin from storage ----
    const savedPlugin = storage.get('visiblePlugin');
    // Will be resolved after plugins are registered

    // ---- Watch theme from props ----
    watch(
        () => props.theme,
        (newTheme) => {
            if (newTheme) {
                theme.value = newTheme;
            }
        }
    );

    // ---- Watch shouldPersistHeaders ----
    watch(shouldPersistHeaders, (val) => {
        storage.set('shouldPersistHeaders', val ? 'true' : '');
    });

    const store: GraphiQLStore = {
        // State
        schema,
        isIntrospecting,
        fetchError,
        validationErrors,
        tabs,
        activeTabIndex,
        activeTab,
        isFetching,
        subscription,
        plugins,
        visiblePlugin,
        theme,
        shouldPersistHeaders,
        documentAST,
        operationName,
        operations,
        editors,
        instanceId,
        fetcher,
        storage,
        url: props.url,
        namespace,
        isHeadersEditorEnabled,
        defaultQuery,

        // Actions
        introspect,
        run,
        stop,
        addTab,
        closeTab,
        changeTab,
        prettify,
        copyQuery,
        mergeFragments,
        setTheme,
        setVisiblePlugin,
        updateOperationFacts,
        setEditorValue,
        getEditorValue,
        setResponseValue,
        storeTabs,
    };

    // Restore visible plugin after plugins are registered (deferred)
    if (savedPlugin) {
        const originalSetPlugins = (newPlugins: GraphiQLPlugin[]) => {
            plugins.value = newPlugins;
            const found = newPlugins.find((p) => p.title === savedPlugin);
            if (found) {
                visiblePlugin.value = found;
            }
        };
        // This will be called from GraphiQL.vue after registering plugins
        (store as any)._restorePlugins = originalSetPlugins;
    }

    return store;
}

export const GRAPHIQL_STORE_KEY: InjectionKey<GraphiQLStore> = Symbol('graphiql-store');
