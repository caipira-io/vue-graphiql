export default {
    languageWorkers: ['editorWorkerService', 'json'] as any,
    customWorkers: [
        {
            label: 'graphql',
            entry: 'monaco-graphql/esm/graphql.worker.js',
        },
    ],
};
