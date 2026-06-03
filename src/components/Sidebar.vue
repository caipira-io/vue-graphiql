<script setup lang="ts">
import { inject, ref, computed } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';

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
            <component :is="plugin.icon" />
        </button>

        <div class="flex-1" />

        <!-- Re-fetch schema -->
        <button
            title="Re-fetch GraphQL Schema"
            class="flex h-8 w-8 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            :class="{ 'animate-spin': store.isIntrospecting.value }"
            @click="store.introspect()"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-4 w-4"
            >
                <path
                    fill-rule="evenodd"
                    d="M15.312 11.424a5.5 5.5 0 01-9.375 2.12l-.708.709a6.5 6.5 0 0011.094-2.83h-1.011zM4.688 8.576a5.5 5.5 0 019.375-2.12l.708-.709A6.5 6.5 0 003.677 8.576h1.011z"
                    clip-rule="evenodd"
                />
                <path
                    d="M10 3.75a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 0110 3.75zM10 13a.75.75 0 01.75.75v2.5a.75.75 0 01-1.5 0v-2.5A.75.75 0 0110 13z"
                />
            </svg>
        </button>

        <!-- Keyboard shortcuts -->
        <button
            title="Keyboard Shortcuts"
            class="flex h-8 w-8 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            @click="showShortcuts = true"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-4 w-4"
            >
                <path
                    fill-rule="evenodd"
                    d="M2 4.75A2.75 2.75 0 014.75 2h10.5A2.75 2.75 0 0118 4.75v6.5A2.75 2.75 0 0115.25 14H4.75A2.75 2.75 0 012 11.25v-6.5zm2.75-1.25a1.25 1.25 0 00-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h10.5c.69 0 1.25-.56 1.25-1.25v-6.5c0-.69-.56-1.25-1.25-1.25H4.75zM5 6a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 015 6zm3 0a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 018 6zm3 0a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 0111 6zm3 0a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 0114 6zM6 9a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 016 9zm6 0a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 0112 9zM7.5 15.25a.75.75 0 000 1.5h5a.75.75 0 000-1.5h-5zM9 9a.75.75 0 01.75-.75h.5a.75.75 0 010 1.5h-.5A.75.75 0 019 9z"
                    clip-rule="evenodd"
                />
            </svg>
        </button>

        <!-- Settings -->
        <button
            title="Settings"
            class="flex h-8 w-8 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            @click="showSettings = true"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                class="h-4 w-4"
            >
                <path
                    fill-rule="evenodd"
                    d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.929 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z"
                    clip-rule="evenodd"
                />
            </svg>
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
