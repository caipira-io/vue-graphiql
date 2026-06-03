<script setup lang="ts">
import { provide, onMounted, onUnmounted, ref, watch, computed, markRaw, h, defineAsyncComponent } from 'vue';
import { GRAPHIQL_STORE_KEY, type GraphiQLPlugin, type GraphiQLProps } from '../types';
import { createGraphiQLStore } from '../store';
import { useDragResize } from '../composables/useDragResize';

import Sidebar from './Sidebar.vue';
import TabBar from './TabBar.vue';
import QueryEditor from './QueryEditor.vue';
import JsonEditor from './JsonEditor.vue';
import ResponseEditor from './ResponseEditor.vue';
import ExecuteButton from './ExecuteButton.vue';
import Toolbar from './Toolbar.vue';

// Async plugin components
const DocExplorer = defineAsyncComponent(() => import('./DocExplorer.vue'));
const HistoryPanel = defineAsyncComponent(() => import('./HistoryPanel.vue'));
const Explorer = defineAsyncComponent(() => import('./Explorer.vue'));

const props = withDefaults(defineProps<GraphiQLProps>(), {
    theme: 'light',
    namespace: '',
    defaultQuery: '# Welcome to GraphiQL\n#\n# Start typing a query, or use the Explorer\n# to build one by clicking fields.\n\n',
    isHeadersEditorEnabled: false,
});

// Create and provide the store
const store = createGraphiQLStore(props);
provide(GRAPHIQL_STORE_KEY, store);

// ---- Plugin icons (inline SVG components) ----
const ExplorerIcon = {
    render() {
        return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor', class: 'w-4 h-4' }, [
            h('path', { 'fill-rule': 'evenodd', d: 'M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5h-7.5a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z', 'clip-rule': 'evenodd' }),
        ]);
    },
};

const DocExplorerIcon = {
    render() {
        return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor', class: 'w-4 h-4' }, [
            h('path', { 'fill-rule': 'evenodd', d: 'M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zM10 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 0110 8z', 'clip-rule': 'evenodd' }),
        ]);
    },
};

const HistoryIcon = {
    render() {
        return h('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 20 20', fill: 'currentColor', class: 'w-4 h-4' }, [
            h('path', { 'fill-rule': 'evenodd', d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z', 'clip-rule': 'evenodd' }),
        ]);
    },
};

// ---- Register built-in plugins ----
const builtinPlugins: GraphiQLPlugin[] = [
    {
        title: 'Explorer',
        icon: markRaw(ExplorerIcon),
        content: markRaw(Explorer),
    },
    {
        title: 'Documentation Explorer',
        icon: markRaw(DocExplorerIcon),
        content: markRaw(DocExplorer),
    },
    {
        title: 'History',
        icon: markRaw(HistoryIcon),
        content: markRaw(HistoryPanel),
    },
];

// Register plugins
if ((store as any)._restorePlugins) {
    (store as any)._restorePlugins(builtinPlugins);
} else {
    store.plugins.value = builtinPlugins;
}

// ---- Active editor tool tab ----
const activeEditorTool = ref<'variables' | 'headers'>('variables');
const editorToolsVisible = ref(true);

// ---- Resize: plugin panel vs sessions ----
const pluginResize = useDragResize({
    direction: 'horizontal',
    defaultSizeRelation: 0.4,
    initiallyHidden: store.visiblePlugin.value ? null : 'first',
    sizeThresholdFirst: 120,
    sizeThresholdSecond: 200,
    storageKey: 'pluginFlex',
    storage: store.storage,
    onHiddenElementChange(element) {
        if (element === 'first') {
            store.setVisiblePlugin(null);
        }
    },
});

// ---- Resize: editors vs response ----
const editorResize = useDragResize({
    direction: 'horizontal',
    defaultSizeRelation: 1,
    storageKey: 'editorFlex',
    storage: store.storage,
});

// ---- Resize: query editor vs editor tools ----
const editorToolsResize = useDragResize({
    direction: 'vertical',
    defaultSizeRelation: 3,
    storageKey: 'editorToolsFlex',
    storage: store.storage,
    initiallyHidden: editorToolsVisible.value ? null : 'second',
    onHiddenElementChange(element) {
        editorToolsVisible.value = element !== 'second';
    },
});

// ---- Sync plugin visibility with resize ----
watch(() => store.visiblePlugin.value, (plugin) => {
    if (plugin && pluginResize.hiddenElement.value === 'first') {
        pluginResize.setHiddenElement(null);
    } else if (!plugin && pluginResize.hiddenElement.value !== 'first') {
        pluginResize.setHiddenElement('first');
    }
});

function toggleEditorTools() {
    if (editorToolsVisible.value) {
        editorToolsResize.setHiddenElement('second');
    } else {
        editorToolsResize.setHiddenElement(null);
    }
    editorToolsVisible.value = !editorToolsVisible.value;
}

// ---- Lifecycle ----
onMounted(async () => {
    // Introspect schema on mount
    await store.introspect();
});

// Global keyboard shortcuts
function onKeyDown(e: KeyboardEvent) {
    // Ctrl+R -> Re-fetch schema
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        store.introspect();
    }
}

onMounted(() => document.addEventListener('keydown', onKeyDown));
onUnmounted(() => document.removeEventListener('keydown', onKeyDown));
</script>

<template>
    <div
        class="graphiql-container flex h-full w-full overflow-hidden text-sm"
        :class="store.theme.value === 'dark' ? 'dark' : ''"
    >
        <!-- Sidebar -->
        <Sidebar />

        <!-- Main area -->
        <div class="flex flex-1 min-w-0 min-h-0">
            <!-- Plugin panel -->
            <div :ref="(el) => { pluginResize.firstRef.value = el as HTMLElement }" class="flex flex-col min-w-0 min-h-0 overflow-hidden border-r border-[var(--gql-border)]">
                <div v-if="store.visiblePlugin.value" class="flex flex-col h-full">
                    <div class="flex items-center justify-between px-3 h-10 border-b border-[var(--gql-border)] bg-[var(--gql-surface)] shrink-0">
                        <span class="text-xs font-semibold text-[var(--gql-text)] truncate">{{ store.visiblePlugin.value.title }}</span>
                        <button
                            class="flex items-center justify-center w-6 h-6 rounded text-[var(--gql-text-secondary)] hover:text-[var(--gql-text)] hover:bg-[var(--gql-hover)] transition-colors"
                            @click="store.setVisiblePlugin(null)"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                                <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                            </svg>
                        </button>
                    </div>
                    <div class="flex-1 overflow-auto min-h-0">
                        <component :is="store.visiblePlugin.value.content" />
                    </div>
                </div>
            </div>

            <!-- Plugin resize handle -->
            <div
                :ref="(el) => { pluginResize.dragBarRef.value = el as HTMLElement }"
                class="gql-drag-bar-h"
            />

            <!-- Sessions area -->
            <div :ref="(el) => { pluginResize.secondRef.value = el as HTMLElement }" class="flex flex-col flex-1 min-w-0 min-h-0">
                <!-- Tab bar -->
                <TabBar />

                <!-- Session content -->
                <div class="flex flex-1 min-w-0 min-h-0">
                    <!-- Editors panel -->
                    <div :ref="(el) => { editorResize.firstRef.value = el as HTMLElement }" class="flex flex-col min-w-0 min-h-0">
                        <!-- Query editor + toolbar -->
                        <div :ref="(el) => { editorToolsResize.firstRef.value = el as HTMLElement }" class="flex min-h-0">
                            <div class="flex-1 min-w-0 min-h-0">
                                <QueryEditor />
                            </div>
                            <div class="flex flex-col items-center border-l border-[var(--gql-border)] bg-[var(--gql-surface)]">
                                <div class="py-2">
                                    <ExecuteButton />
                                </div>
                                <Toolbar />
                            </div>
                        </div>

                        <!-- Editor tools tabs -->
                        <div
                            :ref="(el) => { editorToolsResize.dragBarRef.value = el as HTMLElement }"
                            class="gql-drag-bar-v flex items-center gap-0 border-y border-[var(--gql-border)] bg-[var(--gql-surface)]"
                        >
                            <button
                                class="px-3 py-1 text-xs transition-colors"
                                :class="activeEditorTool === 'variables'
                                    ? 'text-[var(--gql-text)] font-medium'
                                    : 'text-[var(--gql-text-secondary)] hover:text-[var(--gql-text)]'"
                                @click="activeEditorTool = 'variables'"
                            >Variables</button>
                            <button
                                v-if="store.isHeadersEditorEnabled"
                                class="px-3 py-1 text-xs transition-colors"
                                :class="activeEditorTool === 'headers'
                                    ? 'text-[var(--gql-text)] font-medium'
                                    : 'text-[var(--gql-text-secondary)] hover:text-[var(--gql-text)]'"
                                @click="activeEditorTool = 'headers'"
                            >Headers</button>
                            <div class="flex-1" />
                            <button
                                class="flex items-center justify-center w-6 h-6 mr-1 rounded text-[var(--gql-text-secondary)] hover:text-[var(--gql-text)] transition-colors"
                                @click="toggleEditorTools()"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 transition-transform" :class="editorToolsVisible ? '' : 'rotate-180'">
                                    <path fill-rule="evenodd" d="M11.78 9.78a.75.75 0 01-1.06 0L8 7.06 5.28 9.78a.75.75 0 01-1.06-1.06l3.25-3.25a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06z" clip-rule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <!-- Editor tools content -->
                        <div :ref="(el) => { editorToolsResize.secondRef.value = el as HTMLElement }" class="min-h-0">
                            <div class="size-full" :class="activeEditorTool === 'variables' ? '' : 'hidden'">
                                <JsonEditor mode="variable" />
                            </div>
                            <div v-if="store.isHeadersEditorEnabled" class="size-full" :class="activeEditorTool === 'headers' ? '' : 'hidden'">
                                <JsonEditor mode="header" />
                            </div>
                        </div>
                    </div>

                    <!-- Editor/Response resize handle -->
                    <div
                        :ref="(el) => { editorResize.dragBarRef.value = el as HTMLElement }"
                        class="gql-drag-bar-h"
                    />

                    <!-- Response panel -->
                    <div :ref="(el) => { editorResize.secondRef.value = el as HTMLElement }" class="flex flex-col min-w-0 min-h-0 relative">
                        <!-- Loading spinner overlay -->
                        <div
                            v-if="store.isFetching.value"
                            class="absolute inset-0 z-10 flex items-center justify-center bg-[var(--gql-bg)]/50 pointer-events-none"
                        >
                            <div class="w-6 h-6 border-2 border-[var(--gql-primary)] border-t-transparent rounded-full animate-spin" />
                        </div>

                        <!-- Fetch error banner -->
                        <div
                            v-if="store.fetchError.value"
                            class="px-3 py-2 text-xs text-red-500 bg-red-50 dark:bg-red-950/20 border-b border-red-200 dark:border-red-900"
                        >
                            {{ store.fetchError.value }}
                        </div>

                        <ResponseEditor />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
