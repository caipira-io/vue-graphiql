<script setup lang="ts">
import { inject } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';

const store = inject(GRAPHIQL_STORE_KEY)!;
</script>

<template>
    <div class="flex items-center h-10 border-b border-(--gql-border) bg-(--gql-surface)">
        <!-- Tabs -->
        <div class="flex items-end flex-1 overflow-x-auto min-w-0 gap-0">
            <button
                v-for="(tab, index) in store.tabs.value"
                :key="tab.id"
                class="group relative flex items-center gap-1.5 px-3 h-9 text-xs border-r border-(--gql-border) min-w-0 max-w-40 transition-colors shrink-0"
                :class="
                    index === store.activeTabIndex.value
                        ? 'bg-(--gql-bg) text-(--gql-text) border-b-2 border-b-(--gql-primary)'
                        : 'bg-(--gql-surface) text-(--gql-text-secondary) hover:text-(--gql-text) hover:bg-(--gql-hover)'
                "
                @click="store.changeTab(index)"
            >
                <span class="truncate">{{ tab.title || '(untitled)' }}</span>
                <span
                    v-if="store.tabs.value.length > 1"
                    class="shrink-0 w-4 h-4 rounded-sm flex items-center justify-center text-(--gql-text-secondary) hover:text-(--gql-text) hover:bg-(--gql-border) opacity-0 group-hover:opacity-100 transition-opacity"
                    @click.stop="store.closeTab(index)"
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        class="w-3 h-3"
                    >
                        <path
                            d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z"
                        />
                    </svg>
                </span>
            </button>
        </div>

        <!-- Add tab button -->
        <button
            title="New Tab"
            class="flex items-center justify-center w-8 h-8 mx-1 rounded text-(--gql-text-secondary) hover:text-(--gql-text) hover:bg-(--gql-hover) transition-colors shrink-0"
            @click="store.addTab()"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                class="w-4 h-4"
            >
                <path
                    d="M8.75 3.75a.75.75 0 00-1.5 0v3.5h-3.5a.75.75 0 000 1.5h3.5v3.5a.75.75 0 001.5 0v-3.5h3.5a.75.75 0 000-1.5h-3.5v-3.5z"
                />
            </svg>
        </button>
    </div>
</template>
