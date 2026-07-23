export { default as GraphiQL } from '@/src/components/GraphiQL.vue';

// Re-export types
export type {
    TabState,
    HistoryItem,
    GraphiQLProps,
    GraphiQLStore,
    GraphiQLPlugin,
    DocExplorerNavItem,
} from '@/src/types';

// Re-export store creator for advanced usage
export { createGraphiQLStore, GRAPHIQL_STORE_KEY } from '@/src/store';
