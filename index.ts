import './src/style.css';

export { default as GraphiQL } from './src/components/GraphiQL.vue';
export { default as monacoViteConfig } from './monaco-vite-config';

// Re-export types
export type { GraphiQLProps, GraphiQLPlugin, GraphiQLStore, TabState, HistoryItem, DocExplorerNavItem } from './src/types';
export { GRAPHIQL_STORE_KEY } from './src/types';

// Re-export store creator for advanced usage
export { createGraphiQLStore } from './src/store';
