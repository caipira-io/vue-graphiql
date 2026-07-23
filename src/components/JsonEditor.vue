<script setup lang="ts">
import type { Extension } from '@codemirror/state';

import { keymap } from '@codemirror/view';
import { CodeEditor } from '@caipira/tamandua/components/CodeEditor';
import { ref, inject, computed, onMounted } from 'vue';

import { useCodeMirror } from '@/src/composables/useCodeMirror';
import { GRAPHIQL_STORE_KEY } from '@/src/store';

const props = defineProps<{
    mode: 'variable' | 'header';
}>();

const store = inject(GRAPHIQL_STORE_KEY)!;
const { jsonExtensions } = useCodeMirror();

const host = ref<InstanceType<typeof CodeEditor> | null>(null);

/**
 * Same shortcuts as the former Monaco addAction bindings: Mod-Enter run,
 * Shift-Mod-P prettify.
 */
const jsonKeymap: Extension = keymap.of([
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
]);

const extensions = jsonExtensions({
    lineNumbers: true,
    lint: true,
    extraKeymap: jsonKeymap,
});

/**
 * Reactive so switching tabs re-renders the pane through v-model (Monaco used
 * an imperative setValue on tab change; the host is v-model driven instead).
 */
const value = computed(() =>
    props.mode === 'variable'
        ? (store.activeTab.value?.variables ?? '')
        : (store.activeTab.value?.headers ?? '')
);

onMounted(() => {
    store.editors[props.mode] = host.value?.view ?? null;
});

function onValueChange(newValue: string) {
    store.setEditorValue(props.mode, newValue);
}
</script>

<template>
    <CodeEditor
        ref="host"
        class="size-full min-h-0 min-w-0"
        :model-value="value"
        :extensions="extensions"
        :dark="store.theme.value === 'dark'"
        @update:model-value="onValueChange"
    />
</template>
