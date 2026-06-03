import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import monacoEditorPlugin from 'vite-plugin-monaco-editor';

import monacoViteConfig from './monaco-vite-config';

const monacoPlugin = (monacoEditorPlugin as any).default ?? monacoEditorPlugin;

export default defineConfig({
    plugins: [vue(), tailwindcss(), monacoPlugin(monacoViteConfig)],
    optimizeDeps: {
        exclude: ['esbuild'],
    },
    resolve: {
        tsconfigPaths: true,
    },
    server: {
        open: false,
    },
});
