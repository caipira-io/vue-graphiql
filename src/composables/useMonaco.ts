import { shallowRef, markRaw } from 'vue';

type Monaco = typeof import('monaco-editor');

interface MonacoGraphQLAPI {
    setSchemaConfig(config: any[]): void;
    setExternalFragmentDefinitions?(fragments: any[]): void;
}

interface MonacoState {
    monaco: Monaco | null;
    monacoGraphQL: MonacoGraphQLAPI | null;
    isLoading: boolean;
    isInitialized: boolean;
}

const state = shallowRef<MonacoState>({
    monaco: null,
    monacoGraphQL: null,
    isLoading: false,
    isInitialized: false,
});

let initPromise: Promise<void> | null = null;

export function useMonaco() {
    async function initialize() {
        if (state.value.isInitialized || state.value.isLoading) {
            return initPromise;
        }

        state.value = { ...state.value, isLoading: true };

        initPromise = (async () => {
            try {
                // Dynamic import for SSR safety - these are peer dependencies
                const monacoEditorModule =
                    await import('monaco-graphql/esm/monaco-editor.js');
                const monacoGraphQLModule = await import('monaco-graphql/esm/lite.js');

                const monaco = monacoEditorModule as any as Monaco;

                // Configure JSON defaults to handle comments and trailing commas
                monaco.languages.json?.jsonDefaults?.setDiagnosticsOptions({
                    allowComments: true,
                    trailingCommas: 'ignore',
                    schemaValidation: 'warning',
                });

                // Define custom themes
                monaco.editor.defineTheme('graphiql-light', {
                    base: 'vs',
                    inherit: true,
                    rules: [
                        { token: 'keyword.gql', foreground: 'b62e71' },
                        { token: 'type.identifier.gql', foreground: 'ca9800' },
                        { token: 'key.identifier.gql', foreground: '1f61a0' },
                        { token: 'string.gql', foreground: 'd64292' },
                        { token: 'string.invalid.gql', foreground: 'd64292' },
                        { token: 'comment.gql', foreground: '999999' },
                        { token: 'number.gql', foreground: '2882f9' },
                        { token: 'keyword', foreground: 'b62e71' },
                    ],
                    colors: {
                        'editor.background': '#ffffff',
                        'editor.lineHighlightBackground': '#f6f8fa',
                        'editorLineNumber.foreground': '#b3b3b3',
                    },
                });

                monaco.editor.defineTheme('graphiql-dark', {
                    base: 'vs-dark',
                    inherit: true,
                    rules: [
                        { token: 'keyword.gql', foreground: 'f472b6' },
                        { token: 'type.identifier.gql', foreground: 'e0a825' },
                        { token: 'key.identifier.gql', foreground: '7cb4f0' },
                        { token: 'string.gql', foreground: 'e57eb0' },
                        { token: 'string.invalid.gql', foreground: 'e57eb0' },
                        { token: 'comment.gql', foreground: '6a737d' },
                        { token: 'number.gql', foreground: '5cb3ff' },
                        { token: 'keyword', foreground: 'f472b6' },
                    ],
                    colors: {
                        'editor.background': '#0d1117',
                        'editor.lineHighlightBackground': '#161b22',
                        'editorLineNumber.foreground': '#6e7681',
                    },
                });

                // Initialize MonacoGraphQL
                const monacoGraphQL = monacoGraphQLModule.initializeMode({
                    diagnosticSettings: {
                        validateVariablesJSON: {},
                        jsonDiagnosticSettings: {
                            allowComments: true,
                            trailingCommas: 'ignore',
                            schemaValidation: 'warning',
                        },
                    },
                });

                state.value = markRaw({
                    monaco,
                    monacoGraphQL,
                    isLoading: false,
                    isInitialized: true,
                });
            } catch (err) {
                console.error('Failed to initialize Monaco:', err);
                state.value = { ...state.value, isLoading: false };
                throw err;
            }
        })();

        return initPromise;
    }

    function updateSchema(
        schema: import('graphql').GraphQLSchema | null,
        instanceId: string
    ) {
        if (!state.value.monacoGraphQL || !schema) return;
        state.value.monacoGraphQL.setSchemaConfig([
            {
                uri: `${instanceId}schema.graphql`,
                schema,
            },
        ]);
    }

    return {
        state,
        initialize,
        updateSchema,
    };
}
