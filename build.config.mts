import dts from 'vite-plugin-dts';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [
        vue(),
        tailwindcss(),
        dts({
            outDir: 'dist/types',
            entryRoot: '.',
            copyDtsFiles: false,
        }),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    optimizeDeps: {
        exclude: ['esbuild', 'monaco-editor', 'vite-plugin-monaco-editor'],
    },
    build: {
        lib: {
            entry: './index.ts',
            name: 'VueGraphiQL',
            fileName: (format) => `vue-graphiql.${format}.js`,
            formats: ['es'],
        },
        rollupOptions: {
            external: (id) => {
                // Externalize peer dependencies and their subpaths
                if (id === 'vue' || id.startsWith('vue/')) return true;
                if (id === 'graphql' || id.startsWith('graphql/')) return true;
                if (id === 'monaco-editor' || id.startsWith('monaco-editor/'))
                    return true;
                if (id === 'monaco-graphql' || id.startsWith('monaco-graphql/'))
                    return true;
                if (
                    id === 'vite-plugin-monaco-editor' ||
                    id.startsWith('vite-plugin-monaco-editor/')
                )
                    return true;
                return false;
            },
            output: {
                globals: {
                    vue: 'Vue',
                    graphql: 'graphql',
                },
            },
        },
        commonjsOptions: {},
    },
});
