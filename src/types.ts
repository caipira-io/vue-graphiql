import type { editor } from 'monaco-editor';
import type { Fetcher, Unsubscribable } from '@graphiql/toolkit';
import type { Component, InjectionKey, Ref, ShallowRef, ComputedRef } from 'vue';
import type {
    DocumentNode,
    GraphQLError,
    GraphQLSchema,
    OperationDefinitionNode,
} from 'graphql';

export interface TabState {
    id: string;
    hash: string;
    title: string;
    query: string;
    variables: string;
    headers: string;
    operationName: string | null;
    response: string;
}

export interface GraphiQLPlugin {
    title: string;
    icon: Component;
    content: Component;
}

export interface GraphiQLProps {
    url: string;
    theme?: 'light' | 'dark';
    namespace?: string;
    initialQuery?: string;
    defaultQuery?: string;
    isHeadersEditorEnabled?: boolean;
}

export interface GraphiQLStore {
    // Schema
    schema: ShallowRef<GraphQLSchema | null>;
    isIntrospecting: Ref<boolean>;
    fetchError: Ref<string | null>;
    validationErrors: Ref<readonly GraphQLError[]>;

    // Tabs
    tabs: Ref<TabState[]>;
    activeTabIndex: Ref<number>;
    activeTab: ComputedRef<TabState>;

    // Execution
    isFetching: Ref<boolean>;
    subscription: ShallowRef<Unsubscribable | null>;

    // Plugins
    plugins: Ref<GraphiQLPlugin[]>;
    visiblePlugin: Ref<GraphiQLPlugin | null>;

    // Theme
    theme: Ref<'light' | 'dark'>;

    // Settings
    shouldPersistHeaders: Ref<boolean>;

    // Operation facts
    documentAST: ShallowRef<DocumentNode | null>;
    operationName: Ref<string | null>;
    operations: ShallowRef<OperationDefinitionNode[]>;

    // Editor instances (non-reactive, use markRaw)
    editors: {
        query: editor.IStandaloneCodeEditor | null;
        variable: editor.IStandaloneCodeEditor | null;
        header: editor.IStandaloneCodeEditor | null;
        response: editor.IStandaloneCodeEditor | null;
    };

    // Unique instance ID for Monaco URIs
    instanceId: string;

    // Fetcher & Storage
    fetcher: Fetcher;
    storage: StorageWrapper;

    // Configuration
    url: string;
    namespace: string;
    isHeadersEditorEnabled: boolean;
    defaultQuery: string;

    // Actions
    introspect(): Promise<void>;
    run(overrideOperationName?: string): Promise<void>;
    stop(): void;
    addTab(): void;
    closeTab(index: number): void;
    changeTab(index: number): void;
    prettify(): Promise<void>;
    copyQuery(): void;
    mergeFragments(): void;
    setTheme(theme: 'light' | 'dark'): void;
    setVisiblePlugin(plugin: GraphiQLPlugin | null): void;
    updateOperationFacts(): void;
    setEditorValue(which: 'query' | 'variable' | 'header', value: string): void;
    getEditorValue(which: 'query' | 'variable' | 'header' | 'response'): string;
    setResponseValue(value: string): void;
    storeTabs(): void;
}

export interface StorageWrapper {
    get(key: string): string | null;
    set(key: string, value: string): void;
    remove(key: string): void;
}

export interface DocExplorerNavItem {
    name: string;
    def?: any; // GraphQLNamedType | GraphQLField
}

export interface HistoryItem {
    query?: string;
    variables?: string;
    headers?: string;
    operationName?: string;
    label?: string;
    favorite?: boolean;
}

export const GRAPHIQL_STORE_KEY: InjectionKey<GraphiQLStore> = Symbol('graphiql-store');
