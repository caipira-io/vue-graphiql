<script setup lang="ts">
import type { SplitPane } from '@caipira/tamandua';
import type { GraphiQLPlugin, GraphiQLProps } from '@/src/types';

import { Split } from '@caipira/tamandua/components/Split';
import {
    ref,
    markRaw,
    provide,
    computed,
    onMounted,
    onUnmounted,
    defineAsyncComponent,
} from 'vue';

import { GRAPHIQL_STORE_KEY } from '@/src/store';
import { createGraphiQLStore } from '@/src/store';

import Icon from '@/src/components/Icon.vue';
import TabBar from '@/src/components/TabBar.vue';
import Sidebar from '@/src/components/Sidebar.vue';
import Toolbar from '@/src/components/Toolbar.vue';
import JsonEditor from '@/src/components/JsonEditor.vue';
import QueryEditor from '@/src/components/QueryEditor.vue';
import ResponseEditor from '@/src/components/ResponseEditor.vue';

const props = withDefaults(defineProps<GraphiQLProps>(), {
    theme: 'light',
    namespace: '',
    defaultQuery:
        '# Welcome to GraphiQL\n#\n# Start typing a query, or use the Explorer\n# to build one by clicking fields.\n\n',
    isHeadersEditorEnabled: false,
});

// Create and provide the store
const store = createGraphiQLStore(props);
provide(GRAPHIQL_STORE_KEY, store);

// Resizable panes; dragged sizes persist per namespace
const splitKey = (suffix: string) => `${props.namespace}graphiql-split-${suffix}`;

const outerPanes = computed<SplitPane[]>(() =>
    store.visiblePlugin.value
        ? [{ slot: 'plugin', size: '280px' }, { slot: 'main' }]
        : [{ slot: 'main' }],
);

const middlePanes: SplitPane[] = [
    { slot: 'editor', min: 40, class: 'overflow-hidden' },
    { slot: 'response' },
];

const editorPanes: SplitPane[] = [
    { slot: 'query', min: 80 },
    { slot: 'tools', min: 31 },
];

// ---- Register built-in plugins ----
const builtinPlugins: GraphiQLPlugin[] = [
    {
        title: 'Explorer',
        icon: 'magnify',
        content: markRaw(
            defineAsyncComponent(() => import('@/src/components/Explorer.vue'))
        ),
    },
    {
        title: 'Documentation Explorer',
        icon: 'file-document-outline',
        content: markRaw(
            defineAsyncComponent(() => import('@/src/components/DocExplorer.vue'))
        ),
    },
    {
        title: 'History',
        icon: 'clock-time-three-outline',
        content: markRaw(
            defineAsyncComponent(() => import('@/src/components/HistoryPanel.vue'))
        ),
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

onMounted(() => {
    document.addEventListener('keydown', onKeyDown);
});
onUnmounted(() => document.removeEventListener('keydown', onKeyDown));
</script>

<template>
    <div
        class="graphiql-container flex h-full w-full overflow-hidden"
        :class="store.theme.value === 'dark' ? 'dark' : ''"
    >
        <!-- Sidebar -->
        <Sidebar />

        <!-- Main area -->
        <Split
            class="min-h-0 min-w-0 flex-1"
            :panes="outerPanes"
            :storage-key="splitKey('plugin')"
        >
            <!-- Plugin panel -->
            <template #plugin>
                <div
                    class="flex flex-col overflow-hidden border-r border-(--gql-border)"
                >
                    <!-- Header -->
                    <div
                        class="flex h-10 shrink-0 items-center justify-between border-b border-(--gql-border) bg-(--gql-primary) px-3"
                    >
                        <span class="truncate font-semibold text-(--gql-text)">
                            {{ store.visiblePlugin.value?.title }}
                        </span>
                        <button
                            class="text-(--gql-text-seconday)] flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
                            @click="store.setVisiblePlugin(null)"
                        >
                            <Icon
                                name="close"
                                class="h-3.5 w-3.5"
                            />
                        </button>
                    </div>

                    <!-- Content -->
                    <div class="flex-1 overflow-y-auto overflow-x-hidden">
                        <component
                            :is="store.visiblePlugin.value.content"
                            v-if="store.visiblePlugin.value"
                        />
                    </div>
                </div>
            </template>

            <!-- Main content -->
            <template #main>
                <div class="flex flex-col min-w-0 min-h-0">
                    <!-- Tab bar -->
                    <TabBar />

                    <!-- Tab content -->
                    <Split
                        class="flex-1 min-h-0"
                        :panes="middlePanes"
                        :storage-key="splitKey('editors')"
                    >
                        <!-- Editor -->
                        <template #editor>
                            <Split
                                direction="row"
                                :panes="editorPanes"
                                :storage-key="splitKey('tools')"
                            >
                                <!-- Query editor + toolbar -->
                                <template #query>
                                    <div
                                        class="grid grid-cols-[1fr_40px] min-w-0 min-h-0"
                                    >
                                        <QueryEditor />
                                        <Toolbar
                                            class="border-l border-(--gql-border)"
                                        />
                                    </div>
                                </template>

                                <!-- Variables/Headers -->
                                <template #tools>
                                    <div class="min-w-0 min-h-0 flex flex-col">
                                        <!-- Header -->
                                        <div
                                            class="flex shrink-0 items-center gap-0 border-y border-(--gql-border)"
                                        >
                                            <button
                                                class="px-3 py-1 transition-colors"
                                                :class="
                                                    activeEditorTool === 'variables'
                                                        ? 'font-medium text-(--gql-text)'
                                                        : 'text-(--gql-text-secondary) hover:text-(--gql-text)'
                                                "
                                                @click="activeEditorTool = 'variables'"
                                            >
                                                Variables
                                            </button>
                                            <button
                                                v-if="store.isHeadersEditorEnabled"
                                                class="px-3 py-1 transition-colors"
                                                :class="
                                                    activeEditorTool === 'headers'
                                                        ? 'font-medium text-(--gql-text)'
                                                        : 'text-(--gql-text-secondary) hover:text-(--gql-text)'
                                                "
                                                @click="activeEditorTool = 'headers'"
                                            >
                                                Headers
                                            </button>
                                            <div class="flex-1" />
                                            <button
                                                class="mr-1 flex h-6 w-6 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:text-(--gql-text)"
                                                @click="
                                                    editorToolsVisible =
                                                        !editorToolsVisible
                                                "
                                            >
                                                <Icon
                                                    name="chevron-up"
                                                    :class="
                                                        'h-3 w-3 transition-transform' +
                                                        (editorToolsVisible
                                                            ? ' rotate-180'
                                                            : '')
                                                    "
                                                />
                                            </button>
                                        </div>

                                        <!-- Content -->
                                        <div
                                            v-if="editorToolsVisible"
                                            class="min-h-0 flex-1 overflow-hidden"
                                        >
                                            <JsonEditor
                                                v-if="activeEditorTool === 'variables'"
                                                mode="variable"
                                            />
                                            <JsonEditor
                                                v-if="
                                                    store.isHeadersEditorEnabled &&
                                                    activeEditorTool === 'headers'
                                                "
                                                mode="header"
                                            />
                                        </div>
                                    </div>
                                </template>
                            </Split>
                        </template>

                        <!-- Response -->
                        <template #response>
                            <div class="min-w-0">
                                <!-- Loading spinner overlay -->
                                <div
                                    v-if="store.isFetching.value"
                                    class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-(--gql-primary)/50"
                                >
                                    <div
                                        class="h-6 w-6 animate-spin rounded-full border-2 border-(--gql-primary) border-t-transparent"
                                    />
                                </div>

                                <!-- Fetch error banner -->
                                <div
                                    v-if="store.fetchError.value"
                                    class="border-b border-red-200 bg-red-50 px-3 py-2 text-red-500 dark:border-red-900 dark:bg-red-950/20"
                                >
                                    {{ store.fetchError.value }}
                                </div>

                                <ResponseEditor />
                            </div>
                        </template>
                    </Split>
                </div>
            </template>
        </Split>
    </div>
</template>
