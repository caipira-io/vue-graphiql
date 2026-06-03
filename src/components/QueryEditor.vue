<script setup lang="ts">
import { inject, watch } from 'vue';

import { debounce } from '~/src/utils';
import { useMonaco } from '~/src/composables/useMonaco';
import { GRAPHIQL_STORE_KEY } from '~/src/types';

import MonacoEditor from '~/src/components/MonacoEditor.vue';

const store = inject(GRAPHIQL_STORE_KEY)!;
const { updateSchema } = useMonaco();

const uri = `${store.instanceId}operation.graphql`;

function onEditorMounted(editor: any) {
    store.editors.query = editor;

    // Register keyboard shortcuts
    const monaco = (window as any).monaco ?? editor._standaloneKeybindingService;
    // Ctrl+Enter - Execute
    editor.addAction({
        id: 'graphiql.run',
        label: 'Run Query',
        keybindings: [2048 /* CtrlCmd */ | 3 /* Enter */],
        run: () => store.run(),
    });
    // Shift+Ctrl+P - Prettify
    editor.addAction({
        id: 'graphiql.prettify',
        label: 'Prettify',
        keybindings: [2048 | 1024 /* Shift */ | 46 /* KeyP */],
        run: () => store.prettify(),
    });
    // Shift+Ctrl+C - Copy
    editor.addAction({
        id: 'graphiql.copy',
        label: 'Copy Query',
        keybindings: [2048 | 1024 | 33 /* KeyC */],
        run: () => store.copyQuery(),
    });
    // Shift+Ctrl+M - Merge
    editor.addAction({
        id: 'graphiql.merge',
        label: 'Merge Fragments',
        keybindings: [2048 | 1024 | 43 /* KeyM */],
        run: () => store.mergeFragments(),
    });

    // Parse on content change (debounced)
    const debouncedUpdate = debounce(() => {
        store.updateOperationFacts();
    }, 100);

    editor.onDidChangeModelContent(() => {
        debouncedUpdate();
    });

    // Initial parse
    store.updateOperationFacts();
}

function onValueChange(value: string) {
    store.setEditorValue('query', value);
}

// When schema changes, update MonacoGraphQL
watch(
    () => store.schema.value,
    (newSchema) => {
        if (newSchema) {
            updateSchema(newSchema, store.instanceId);
        }
    }
);
</script>

<template>
    <MonacoEditor
        language="graphql"
        :value="store.activeTab.value?.query ?? ''"
        :uri="uri"
        @update:value="onValueChange"
        @mounted="onEditorMounted"
    />
</template>
