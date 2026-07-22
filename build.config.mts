import fs from 'fs';
import path from 'path';

import dts from 'unplugin-dts/vite';
import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { libInjectCss } from 'vite-plugin-lib-inject-css';

export default defineConfig({
    plugins: [
        vue(),
        libInjectCss(),
        tailwindcss(),
        dts({ outDirs: './dist/types' }),
        {
            name: 'emit-style',
            writeBundle(options) {
                const src = path.resolve(__dirname, './assets/styles/style.css');
                const outDir = options.dir ?? 'dist';
                const dest = path.resolve(outDir, 'style.css');

                fs.mkdirSync(outDir, { recursive: true });
                fs.copyFileSync(src, dest);
            },
        },
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
