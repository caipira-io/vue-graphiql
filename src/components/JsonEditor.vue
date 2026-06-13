<script setup lang="ts">
import { inject } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';

import MonacoEditor from '~/src/components/MonacoEditor.vue';

const props = defineProps<{
    mode: 'variable' | 'header';
}>();

const store = inject(GRAPHIQL_STORE_KEY)!;

const uri =
    props.mode === 'variable'
        ? `${store.instanceId}variables.json`
        : `${store.instanceId}request-headers.json`;

function onEditorMounted(editor: any) {
    store.editors[props.mode] = editor;

    // Ctrl+Enter - Execute
    editor.addAction({
        id: 'graphiql.run',
        label: 'Run Query',
        keybindings: [2048 | 3],
        run: () => store.run(),
    });

    // Shift+Ctrl+P - Prettify
    editor.addAction({
        id: 'graphiql.prettify',
        label: 'Prettify',
        keybindings: [2048 | 1024 | 46],
        run: () => store.prettify(),
    });
}

function onValueChange(value: string) {
    store.setEditorValue(props.mode, value);
}

const value =
    props.mode === 'variable'
        ? (store.activeTab.value?.variables ?? '')
        : (store.activeTab.value?.headers ?? '');
</script>

<template>
    <MonacoEditor
        language="json"
        :value="value"
        :uri="uri"
        @update:value="onValueChange"
        @mounted="onEditorMounted"
    />
</template>
