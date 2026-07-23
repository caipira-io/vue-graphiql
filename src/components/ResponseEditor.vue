<script setup lang="ts">
import { CodeEditor } from '@caipira/tamandua/components/CodeEditor';
import { ref, inject, onMounted } from 'vue';

import { useCodeMirror } from '@/src/composables/useCodeMirror';
import { GRAPHIQL_STORE_KEY } from '@/src/store';

const store = inject(GRAPHIQL_STORE_KEY)!;
const { jsonExtensions } = useCodeMirror();

const host = ref<InstanceType<typeof CodeEditor> | null>(null);

/**
 * Read-only result pane: JSON highlighting, no gutter, no linter, word-wrapped
 * (the host wraps by default).
 */
const extensions = jsonExtensions();

onMounted(() => {
    store.editors.response = host.value?.view ?? null;
});
</script>

<template>
    <CodeEditor
        ref="host"
        class="size-full min-h-0 min-w-0"
        :model-value="store.activeTab.value?.response ?? ''"
        :extensions="extensions"
        :dark="store.theme.value === 'dark'"
        :readonly="true"
    />
</template>
