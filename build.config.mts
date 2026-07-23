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
        exclude: ['esbuild', '@caipira/tamandua'],
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
                // Externalize peer dependencies and their subpaths.
                if (id === 'vue' || id.startsWith('vue/')) return true;
                if (id === 'graphql' || id.startsWith('graphql/')) return true;
                // CodeMirror + Lezer must resolve to the consuming app's single
                // copy (identity/instanceof checks). cm6-graphql is bundled, but
                // its @codemirror/* imports are externalized here too.
                if (id === '@codemirror' || id.startsWith('@codemirror/'))
                    return true;
                if (id === '@lezer' || id.startsWith('@lezer/')) return true;
                // The tamandua CodeEditor host is provided by the consumer so
                // there is one CodeMirror host (and one CM copy) across the app.
                if (
                    id === '@caipira/tamandua' ||
                    id.startsWith('@caipira/tamandua/')
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
