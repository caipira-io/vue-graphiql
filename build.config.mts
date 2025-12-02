import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import dts from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        vue(),
        dts({
            outDir: 'dist/types',
            entryRoot: '.',
            copyDtsFiles: false,
        }),
    ],
    optimizeDeps: {
        exclude: ['esbuild', 'monaco-editor', 'vite-plugin-monaco-editor'],
    },
    define: {
        process: {
            env: {},
        },
    },
    build: {
        lib: {
            entry: './index.ts',
            name: 'VueGraphiQL',
            fileName: (format) => `vue-graphiql.${format}.js`,
            formats: ['es'],
        },
        rollupOptions: {
            external: ['vue', 'vite-plugin-monaco-editor'],
            output: {
                globals: {
                    vue: 'Vue',
                },
            },
        },
        commonjsOptions: {},
    },
});
