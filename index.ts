export { default as GraphiQL } from '~/src/components/GraphiQL.vue';
export { default as monacoViteConfig } from '~/monaco-vite-config';

// Re-export types
export type {
    TabState,
    HistoryItem,
    GraphiQLProps,
    GraphiQLStore,
    GraphiQLPlugin,
    DocExplorerNavItem,
} from '~/src/types';
export { GRAPHIQL_STORE_KEY } from '~/src/types';

// Re-export store creator for advanced usage
export { createGraphiQLStore } from '~/src/store';
