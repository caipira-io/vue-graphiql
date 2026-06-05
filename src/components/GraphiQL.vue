<script setup lang="ts">
import type { GraphiQLPlugin, GraphiQLProps } from '~/src/types';

import {
    ref,
    watch,
    markRaw,
    provide,
    onMounted,
    onUnmounted,
    defineAsyncComponent,
} from 'vue';

import { useDragResize } from '~/src/composables/useDragResize';
import { GRAPHIQL_STORE_KEY } from '~/src/types';
import { createGraphiQLStore } from '~/src/store';

import Icon from '~/src/components/Icon.vue';
import TabBar from '~/src/components/TabBar.vue';
import Sidebar from '~/src/components/Sidebar.vue';
import Toolbar from '~/src/components/Toolbar.vue';
import JsonEditor from '~/src/components/JsonEditor.vue';
import QueryEditor from '~/src/components/QueryEditor.vue';
import ExecuteButton from '~/src/components/ExecuteButton.vue';
import ResponseEditor from '~/src/components/ResponseEditor.vue';

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

// ---- Register built-in plugins ----
const builtinPlugins: GraphiQLPlugin[] = [
    {
        title: 'Explorer',
        icon: 'magnify',
        content: markRaw(
            defineAsyncComponent(() => import('~/src/components/Explorer.vue'))
        ),
    },
    {
        title: 'Documentation Explorer',
        icon: 'file-document-outline',
        content: markRaw(
            defineAsyncComponent(() => import('~/src/components/DocExplorer.vue'))
        ),
    },
    {
        title: 'History',
        icon: 'clock-time-three-outline',
        content: markRaw(
            defineAsyncComponent(() => import('~/src/components/HistoryPanel.vue'))
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
watch(
    () => store.visiblePlugin.value,
    (plugin) => {
        if (plugin && pluginResize.hiddenElement.value === 'first') {
            pluginResize.setHiddenElement(null);
        } else if (!plugin && pluginResize.hiddenElement.value !== 'first') {
            pluginResize.setHiddenElement('first');
        }
    }
);

function toggleEditorTools() {
    editorToolsResize.setHiddenElement(editorToolsVisible.value ? 'second' : null);
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
        <div class="flex min-h-0 min-w-0 flex-1">
            <!-- Plugin panel -->
            <div
                :ref="
                    (el) => {
                        pluginResize.firstRef.value = el as HTMLElement;
                    }
                "
                class="flex min-h-0 min-w-0 flex-col overflow-hidden border-r border-(--gql-border)"
            >
                <div
                    v-if="store.visiblePlugin.value"
                    class="flex h-full flex-col"
                >
                    <div
                        class="flex h-10 shrink-0 items-center justify-between border-b border-(--gql-border) bg-(--gql-surface) px-3"
                    >
                        <span class="truncate text-xs font-semibold text-(--gql-text)">{{
                            store.visiblePlugin.value.title
                        }}</span>
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
                    <div class="min-h-0 flex-1 overflow-auto">
                        <component :is="store.visiblePlugin.value.content" />
                    </div>
                </div>
            </div>

            <!-- Plugin resize handle -->
            <div
                :ref="
                    (el) => {
                        pluginResize.dragBarRef.value = el as HTMLElement;
                    }
                "
                class="gql-drag-bar-h"
            />

            <!-- Sessions area -->
            <div
                :ref="
                    (el) => {
                        pluginResize.secondRef.value = el as HTMLElement;
                    }
                "
                class="flex min-h-0 min-w-0 flex-1 flex-col"
            >
                <!-- Tab bar -->
                <TabBar />

                <!-- Session content -->
                <div class="flex min-h-0 min-w-0 flex-1">
                    <!-- Editors panel -->
                    <div
                        :ref="
                            (el) => {
                                editorResize.firstRef.value = el as HTMLElement;
                            }
                        "
                        class="flex min-h-0 min-w-0 flex-col"
                    >
                        <!-- Query editor + toolbar -->
                        <div
                            :ref="
                                (el) => {
                                    editorToolsResize.firstRef.value = el as HTMLElement;
                                }
                            "
                            class="flex min-h-0"
                        >
                            <div class="min-h-0 min-w-0 flex-1">
                                <QueryEditor />
                            </div>
                            <div
                                class="flex flex-col items-center border-l border-(--gql-border) bg-(--gql-surface)"
                            >
                                <div class="py-2">
                                    <ExecuteButton />
                                </div>
                                <Toolbar />
                            </div>
                        </div>

                        <!-- Editor tools tabs -->
                        <div
                            :ref="
                                (el) => {
                                    editorToolsResize.dragBarRef.value =
                                        el as HTMLElement;
                                }
                            "
                            class="gql-drag-bar-v flex items-center gap-0 border-y border-(--gql-border) bg-(--gql-surface)"
                        >
                            <button
                                class="px-3 py-1 text-xs transition-colors"
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
                                class="px-3 py-1 text-xs transition-colors"
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
                                @click="toggleEditorTools()"
                            >
                                <Icon
                                    name="chevron-up"
                                    :class="
                                        'h-3 w-3 transition-transform' +
                                        (editorToolsVisible ? ' rotate-180' : '')
                                    "
                                />
                            </button>
                        </div>

                        <!-- Editor tools content -->
                        <div
                            :ref="
                                (el) => {
                                    editorToolsResize.secondRef.value = el as HTMLElement;
                                }
                            "
                            class="min-h-0"
                        >
                            <div
                                class="size-full"
                                :class="activeEditorTool === 'variables' ? '' : 'hidden'"
                            >
                                <JsonEditor mode="variable" />
                            </div>
                            <div
                                v-if="store.isHeadersEditorEnabled"
                                class="size-full"
                                :class="activeEditorTool === 'headers' ? '' : 'hidden'"
                            >
                                <JsonEditor mode="header" />
                            </div>
                        </div>
                    </div>

                    <!-- Editor/Response resize handle -->
                    <div
                        :ref="
                            (el) => {
                                editorResize.dragBarRef.value = el as HTMLElement;
                            }
                        "
                        class="gql-drag-bar-h"
                    />

                    <!-- Response panel -->
                    <div
                        :ref="
                            (el) => {
                                editorResize.secondRef.value = el as HTMLElement;
                            }
                        "
                        class="relative flex min-h-0 min-w-0 flex-col"
                    >
                        <!-- Loading spinner overlay -->
                        <div
                            v-if="store.isFetching.value"
                            class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-(--gql-bg)/50"
                        >
                            <div
                                class="h-6 w-6 animate-spin rounded-full border-2 border-(--gql-primary) border-t-transparent"
                            />
                        </div>

                        <!-- Fetch error banner -->
                        <div
                            v-if="store.fetchError.value"
                            class="border-b border-red-200 bg-red-50 px-3 py-2 text-xs text-red-500 dark:border-red-900 dark:bg-red-950/20"
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
