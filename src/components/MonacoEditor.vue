<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, inject } from 'vue';

import { useMonaco } from '~/src/composables/useMonaco';
import { GRAPHIQL_STORE_KEY } from '~/src/types';

const props = withDefaults(
    defineProps<{
        language?: string;
        value?: string;
        readOnly?: boolean;
        lineNumbers?: boolean;
        wordWrap?: boolean;
        uri?: string;
        tabIndex?: number;
    }>(),
    {
        language: 'json',
        value: '',
        readOnly: false,
        lineNumbers: true,
        wordWrap: false,
        tabIndex: -1,
    }
);

const emit = defineEmits<{
    (e: 'update:value', value: string): void;
    (e: 'mounted', editor: any): void;
}>();

const store = inject(GRAPHIQL_STORE_KEY)!;
const containerRef = ref<HTMLElement | null>(null);
const { state: monacoState, initialize } = useMonaco();
let editorInstance: any = null;
let isSettingValue = false;

onMounted(async () => {
    await initialize();

    const monaco = monacoState.value.monaco;
    if (!monaco || !containerRef.value) return;

    const themeName = store.theme.value === 'dark' ? 'graphiql-dark' : 'graphiql-light';

    // Create or get the model
    let model: any = null;
    if (props.uri) {
        const uri = monaco.Uri.parse(props.uri);
        model = monaco.editor.getModel(uri);
        if (!model) {
            model = monaco.editor.createModel(props.value, props.language, uri);
        } else {
            if (model.getValue() !== props.value) {
                model.setValue(props.value);
            }
        }
    }

    editorInstance = monaco.editor.create(containerRef.value, {
        model: model ?? undefined,
        value: model ? undefined : props.value,
        language: model ? undefined : props.language,
        theme: themeName,
        automaticLayout: true,
        fontSize: 14,
        minimap: { enabled: false },
        tabSize: 2,
        renderLineHighlight: 'none',
        stickyScroll: { enabled: false },
        overviewRulerLanes: 0,
        scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
        },
        scrollBeyondLastLine: false,
        fontFamily:
            '"Fira Code", "Cascadia Code", "JetBrains Mono", Menlo, Monaco, "Courier New", monospace',
        fontLigatures: true,
        lineNumbersMinChars: 3,
        readOnly: props.readOnly,
        lineNumbers: props.lineNumbers ? 'on' : 'off',
        wordWrap: props.wordWrap ? 'on' : 'off',
        tabIndex: props.tabIndex,
        padding: { top: 8, bottom: 8 },
        glyphMargin: false,
        folding: true,
        contextmenu: true,
    });

    // Listen for content changes
    editorInstance.onDidChangeModelContent(() => {
        if (isSettingValue) return;
        const newValue = editorInstance.getValue();
        emit('update:value', newValue);
    });

    emit('mounted', editorInstance);
});

// Watch for external value changes
watch(
    () => props.value,
    (newValue) => {
        if (editorInstance && editorInstance.getValue() !== newValue) {
            isSettingValue = true;
            editorInstance.setValue(newValue);
            isSettingValue = false;
        }
    }
);

// Watch for theme changes
watch(
    () => store.theme.value,
    (newTheme) => {
        if (editorInstance && monacoState.value.monaco) {
            const themeName = newTheme === 'dark' ? 'graphiql-dark' : 'graphiql-light';
            monacoState.value.monaco.editor.setTheme(themeName);
        }
    }
);

onUnmounted(() => {
    if (editorInstance) {
        // Don't dispose models - they may be shared
        editorInstance.dispose();
        editorInstance = null;
    }
});

defineExpose({
    getEditor: () => editorInstance,
});
</script>

<template>
    <div
        class="size-full min-w-0 min-h-0"
        ref="containerRef"
    />
</template>
