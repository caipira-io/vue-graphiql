<script setup lang="ts">
import { inject, ref, computed } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';

import Icon from '~/src/components/Icon.vue';

const store = inject(GRAPHIQL_STORE_KEY)!;

const showSettings = ref(false);
const showShortcuts = ref(false);

const pluginButtons = computed(() => store.plugins.value);
const isActive = (plugin: any) => store.visiblePlugin.value?.title === plugin.title;

function togglePlugin(plugin: any) {
    if (store.visiblePlugin.value?.title === plugin.title) {
        store.setVisiblePlugin(null);
    } else {
        store.setVisiblePlugin(plugin);
    }
}

function clearStorage() {
    try {
        const prefix = store.namespace ? `${store.namespace}:` : 'graphiql:';
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(prefix)) keys.push(key);
        }
        keys.forEach((k) => localStorage.removeItem(k));
    } catch {
        /* ignore */
    }
    showSettings.value = false;
}
</script>

<template>
    <div
        class="flex flex-col items-center gap-1 border-r border-(--gql-border) bg-(--gql-surface) py-2"
    >
        <!-- Plugin buttons -->
        <button
            v-for="plugin in pluginButtons"
            :key="plugin.title"
            :title="plugin.title"
            class="flex h-8 w-8 items-center justify-center rounded transition-colors"
            :class="
                isActive(plugin)
                    ? 'bg-(--gql-primary) text-white'
                    : 'text-(--gql-text-secondary)] hover:bg-(--gql-hover) hover:text-(--gql-text)'
            "
            @click="togglePlugin(plugin)"
        >
            <Icon
                :name="plugin.icon"
                class="w-4 h-4"
            />
        </button>

        <div class="flex-1" />

        <!-- Re-fetch schema -->
        <button
            title="Re-fetch GraphQL Schema"
            class="flex h-8 w-8 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            :class="{ 'animate-spin': store.isIntrospecting.value }"
            @click="store.introspect()"
        >
            <Icon
                name="refresh"
                class="h-4 w-4"
            />
        </button>

        <!-- Keyboard shortcuts -->
        <button
            title="Keyboard Shortcuts"
            class="flex h-8 w-8 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            @click="showShortcuts = true"
        >
            <Icon
                name="keyboard-outline"
                class="h-4 w-4"
            />
        </button>

        <!-- Settings -->
        <button
            title="Settings"
            class="flex h-8 w-8 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            @click="showSettings = true"
        >
            <Icon
                name="cog"
                class="h-4 w-4"
            />
        </button>

        <!-- Settings Dialog -->
        <Teleport to="body">
            <div
                v-if="showSettings"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="showSettings = false"
            >
                <div
                    class="max-w-md min-w-80 rounded-lg border border-(--gql-border) bg-(--gql-bg) p-6 shadow-xl"
                >
                    <h2 class="mb-4 text-lg font-semibold text-(--gql-text)">Settings</h2>

                    <div class="space-y-4">
                        <!-- Theme -->
                        <div class="flex items-center justify-between">
                            <label class="text-sm text-(--gql-text)">Theme</label>
                            <div class="flex gap-1 rounded bg-(--gql-surface) p-0.5">
                                <button
                                    class="rounded px-3 py-1 text-xs transition-colors"
                                    :class="
                                        store.theme.value === 'light'
                                            ? 'bg-(--gql-bg) text-(--gql-text) shadow-sm'
                                            : 'text-(--gql-text-secondary)'
                                    "
                                    @click="store.setTheme('light')"
                                >
                                    Light
                                </button>
                                <button
                                    class="rounded px-3 py-1 text-xs transition-colors"
                                    :class="
                                        store.theme.value === 'dark'
                                            ? 'bg-(--gql-bg) text-(--gql-text) shadow-sm'
                                            : 'text-(--gql-text-secondary)'
                                    "
                                    @click="store.setTheme('dark')"
                                >
                                    Dark
                                </button>
                            </div>
                        </div>

                        <!-- Persist Headers -->
                        <div class="flex items-center justify-between">
                            <label class="text-sm text-(--gql-text)"
                                >Persist Headers</label
                            >
                            <button
                                class="relative h-5 w-10 rounded-full transition-colors"
                                :class="
                                    store.shouldPersistHeaders.value
                                        ? 'bg-(--gql-primary)'
                                        : 'bg-(--gql-border)'
                                "
                                @click="
                                    store.shouldPersistHeaders.value =
                                        !store.shouldPersistHeaders.value
                                "
                            >
                                <span
                                    class="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform"
                                    :class="
                                        store.shouldPersistHeaders.value
                                            ? 'translate-x-5'
                                            : 'translate-x-0.5'
                                    "
                                />
                            </button>
                        </div>

                        <!-- Clear Storage -->
                        <div class="border-t border-(--gql-border) pt-2">
                            <button
                                class="w-full rounded px-3 py-2 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/20"
                                @click="clearStorage()"
                            >
                                Clear Storage
                            </button>
                        </div>
                    </div>

                    <div class="mt-4 flex justify-end">
                        <button
                            class="rounded bg-(--gql-surface) px-4 py-1.5 text-sm text-(--gql-text) transition-colors hover:bg-(--gql-hover)"
                            @click="showSettings = false"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>

        <!-- Shortcuts Dialog -->
        <Teleport to="body">
            <div
                v-if="showShortcuts"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
                @click.self="showShortcuts = false"
            >
                <div
                    class="max-w-md min-w-80 rounded-lg border border-(--gql-border) bg-(--gql-bg) p-6 shadow-xl"
                >
                    <h2 class="mb-4 text-lg font-semibold text-(--gql-text)">
                        Keyboard Shortcuts
                    </h2>
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between text-(--gql-text)">
                            <span>Execute Query</span>
                            <kbd
                                class="rounded bg-(--gql-surface) px-2 py-0.5 font-mono text-xs"
                                >Ctrl + Enter</kbd
                            >
                        </div>
                        <div class="flex justify-between text-(--gql-text)">
                            <span>Prettify</span>
                            <kbd
                                class="rounded bg-(--gql-surface) px-2 py-0.5 font-mono text-xs"
                                >Ctrl + Shift + P</kbd
                            >
                        </div>
                        <div class="flex justify-between text-(--gql-text)">
                            <span>Copy Query</span>
                            <kbd
                                class="rounded bg-(--gql-surface) px-2 py-0.5 font-mono text-xs"
                                >Ctrl + Shift + C</kbd
                            >
                        </div>
                        <div class="flex justify-between text-(--gql-text)">
                            <span>Merge Fragments</span>
                            <kbd
                                class="rounded bg-(--gql-surface) px-2 py-0.5 font-mono text-xs"
                                >Ctrl + Shift + M</kbd
                            >
                        </div>
                        <div class="flex justify-between text-(--gql-text)">
                            <span>Re-fetch Schema</span>
                            <kbd
                                class="rounded bg-(--gql-surface) px-2 py-0.5 font-mono text-xs"
                                >Ctrl + R</kbd
                            >
                        </div>
                    </div>
                    <div class="mt-4 flex justify-end">
                        <button
                            class="rounded bg-(--gql-surface) px-4 py-1.5 text-sm text-(--gql-text) transition-colors hover:bg-(--gql-hover)"
                            @click="showShortcuts = false"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </Teleport>
    </div>
</template>
