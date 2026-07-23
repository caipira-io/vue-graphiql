import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

/*
 * The dev harness is an APP context, so it must guarantee a SINGLE copy of each
 * CodeMirror core package at runtime - CodeMirror uses instanceof/facet-identity
 * checks and throws "Unrecognized extension value ... multiple instances of
 * @codemirror/state" otherwise. @caipira/tamandua is excluded from optimizeDeps
 * (its dist imports @codemirror/* as bare externals), while this harness imports
 * @codemirror/lang-json + cm6-graphql directly; dedupe + a shared optimized
 * bundle keep them all on one instance. Mirrors ui's Vite dedup setup.
 */
const CM_SINGLETONS = [
    '@codemirror/state',
    '@codemirror/view',
    '@codemirror/language',
    '@codemirror/commands',
    '@codemirror/autocomplete',
    '@codemirror/lint',
    '@lezer/common',
    '@lezer/highlight',
    '@lezer/lr',
];

export default defineConfig({
    plugins: [vue(), tailwindcss()],
    optimizeDeps: {
        include: [...CM_SINGLETONS, '@codemirror/lang-json', 'cm6-graphql'],
        exclude: ['esbuild', '@caipira/tamandua'],
    },
    resolve: {
        tsconfigPaths: true,
        alias: {
            '@': fileURLToPath(new URL('.', import.meta.url)),
        },
        dedupe: CM_SINGLETONS,
    },
    server: {
        open: false,
    },
});
