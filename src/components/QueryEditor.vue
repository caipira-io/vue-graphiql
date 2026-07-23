<script setup lang="ts">
import type { Extension } from '@codemirror/state';

import { keymap } from '@codemirror/view';
import { CodeEditor } from '@caipira/tamandua/components/CodeEditor';
import { ref, watch, inject, onMounted } from 'vue';

import { useCodeMirror } from '@/src/composables/useCodeMirror';
import { GRAPHIQL_STORE_KEY } from '@/src/store';

const host = ref<InstanceType<typeof CodeEditor> | null>(null);
const store = inject(GRAPHIQL_STORE_KEY)!;
const { graphqlExtensions, updateQuerySchema } = useCodeMirror();

/**
 * Same shortcuts as the former Monaco addAction bindings, as CodeMirror keys:
 * Mod-Enter run, Shift-Mod-P prettify, Shift-Mod-C copy, Shift-Mod-M merge.
 */
const queryKeymap: Extension = keymap.of([
    {
        key: 'Mod-Enter',
        preventDefault: true,
        run: () => {
            store.run();
            return true;
        },
    },
    {
        key: 'Shift-Mod-p',
        preventDefault: true,
        run: () => {
            store.prettify();
            return true;
        },
    },
    {
        key: 'Shift-Mod-c',
        preventDefault: true,
        run: () => {
            store.copyQuery();
            return true;
        },
    },
    {
        key: 'Shift-Mod-m',
        preventDefault: true,
        run: () => {
            store.mergeFragments();
            return true;
        },
    },
]);

/**
 * Built once. The schema is patched in live via updateQuerySchema (below), so
 * this array is a stable reference and never triggers a host reconfigure.
 */
const extensions = graphqlExtensions(store.schema.value, queryKeymap);

onMounted(() => {
    store.editors.query = host.value?.view ?? null;
    updateQuerySchema(host.value?.view, store.schema.value);
    store.updateOperationFacts();
});

// When the schema (re)loads, feed it to cm6-graphql through the exposed view.
watch(
    () => store.schema.value,
    (schema) => updateQuerySchema(host.value?.view, schema)
);

function onValueChange(value: string) {
    store.setEditorValue('query', value);
}
</script>

<template>
    <CodeEditor
        ref="host"
        class="size-full min-h-0 min-w-0"
        :model-value="store.activeTab.value?.query ?? ''"
        :extensions="extensions"
        :dark="store.theme.value === 'dark'"
        @update:model-value="onValueChange"
    />
</template>
