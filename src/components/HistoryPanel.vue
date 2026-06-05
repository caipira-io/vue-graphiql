<script setup lang="ts">
import type { HistoryItem } from '~/src/types';

import { inject, ref, computed, watch, onMounted } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';

import Icon from '~/src/components/Icon.vue';

const store = inject(GRAPHIQL_STORE_KEY)!;

// History items stored in localStorage
const historyItems = ref<HistoryItem[]>([]);
const favoriteItems = ref<HistoryItem[]>([]);

const allItems = computed(() => {
    return [...favoriteItems.value, ...historyItems.value];
});

function loadHistory() {
    try {
        const raw = store.storage.get('queries');
        if (raw) {
            const parsed = JSON.parse(raw);
            historyItems.value = Array.isArray(parsed.queries)
                ? parsed.queries
                : Array.isArray(parsed)
                  ? parsed
                  : [];
        }
    } catch {
        historyItems.value = [];
    }
    try {
        const raw = store.storage.get('favorites');
        if (raw) {
            const parsed = JSON.parse(raw);
            favoriteItems.value = Array.isArray(parsed.favorites)
                ? parsed.favorites
                : Array.isArray(parsed)
                  ? parsed
                  : [];
        }
    } catch {
        favoriteItems.value = [];
    }
}

function saveHistory() {
    store.storage.set('queries', JSON.stringify({ queries: historyItems.value }));
    store.storage.set('favorites', JSON.stringify({ favorites: favoriteItems.value }));
}

function addToHistory(item: HistoryItem) {
    // Don't add if same as most recent
    const last = historyItems.value[historyItems.value.length - 1];
    if (
        last &&
        last.query === item.query &&
        last.variables === item.variables &&
        last.headers === item.headers
    ) {
        return;
    }
    historyItems.value.push(item);
    // Limit to 20
    if (historyItems.value.length > 20) {
        historyItems.value = historyItems.value.slice(-20);
    }
    saveHistory();
}

function toggleFavorite(item: HistoryItem, index: number) {
    if (item.favorite) {
        // Unfavorite: move from favorites to history
        const idx = favoriteItems.value.findIndex(
            (f) => f.query === item.query && f.variables === item.variables
        );
        if (idx >= 0) favoriteItems.value.splice(idx, 1);
        historyItems.value.push({ ...item, favorite: false });
    } else {
        // Favorite: move from history to favorites
        const idx = historyItems.value.findIndex(
            (h) => h.query === item.query && h.variables === item.variables
        );
        if (idx >= 0) historyItems.value.splice(idx, 1);
        favoriteItems.value.push({ ...item, favorite: true });
    }
    saveHistory();
}

function deleteItem(item: HistoryItem) {
    if (item.favorite) {
        favoriteItems.value = favoriteItems.value.filter(
            (f) => !(f.query === item.query && f.variables === item.variables)
        );
    } else {
        historyItems.value = historyItems.value.filter(
            (h) => !(h.query === item.query && h.variables === item.variables)
        );
    }
    saveHistory();
}

function selectItem(item: HistoryItem) {
    if (item.query) store.setEditorValue('query', item.query);
    if (item.variables) store.setEditorValue('variable', item.variables);
    if (item.headers) store.setEditorValue('header', item.headers);
}

function clearHistory() {
    historyItems.value = [];
    saveHistory();
}

function getItemLabel(item: HistoryItem): string {
    if (item.label) return item.label;
    if (item.operationName) return item.operationName;
    if (!item.query) return '<empty>';
    // Extract operation name
    const match = item.query.match(
        /^(?!#).*(query|subscription|mutation)\s+([a-zA-Z0-9_]+)/m
    );
    return match ? match[2] : '<untitled>';
}

// Record queries when execution starts
watch(
    () => store.isFetching.value,
    (fetching) => {
        if (fetching) {
            const tab = store.activeTab.value;
            if (tab?.query?.trim()) {
                addToHistory({
                    query: tab.query,
                    variables: tab.variables || undefined,
                    headers: tab.headers || undefined,
                    operationName: store.operationName.value ?? undefined,
                });
            }
        }
    }
);

onMounted(loadHistory);
</script>

<template>
    <div class="flex h-full flex-col">
        <div class="flex-1 overflow-auto">
            <div
                v-if="allItems.length === 0"
                class="px-3 py-4 text-center text-xs text-(--gql-text-secondary) italic"
            >
                No history yet. Execute a query to see it here.
            </div>

            <!-- Favorites -->
            <div
                v-if="favoriteItems.length > 0"
                class="px-3 py-2"
            >
                <h4
                    class="mb-1 text-[10px] font-semibold tracking-wider text-(--gql-text-secondary) uppercase"
                >
                    Favorites
                </h4>
                <div
                    v-for="(item, index) in favoriteItems"
                    :key="'fav-' + index"
                    class="group flex cursor-pointer items-center gap-1.5 rounded px-1 py-1.5 transition-colors hover:bg-(--gql-hover)"
                    @click="selectItem(item)"
                >
                    <button
                        class="shrink-0 text-yellow-400"
                        title="Unfavorite"
                        @click.stop="toggleFavorite(item, index)"
                    >
                        <Icon
                            name="star"
                            class="h-3.5 w-3.5"
                        />
                    </button>
                    <span class="flex-1 truncate text-xs text-(--gql-text)">{{
                        getItemLabel(item)
                    }}</span>
                    <button
                        class="shrink-0 text-(--gql-text-secondary) opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                        @click.stop="deleteItem(item)"
                    >
                        <Icon
                            name="close"
                            class="h-3 w-3"
                        />
                    </button>
                </div>
            </div>

            <!-- History -->
            <div
                v-if="historyItems.length > 0"
                class="px-3 py-2"
            >
                <div class="mb-1 flex items-center justify-between">
                    <h4
                        class="text-[10px] font-semibold tracking-wider text-(--gql-text-secondary) uppercase"
                    >
                        History
                    </h4>
                    <button
                        class="text-[10px] text-(--gql-text-secondary) transition-colors hover:text-red-400"
                        @click="clearHistory"
                    >
                        Clear
                    </button>
                </div>
                <div
                    v-for="(item, index) in [...historyItems].reverse()"
                    :key="'hist-' + index"
                    class="group flex cursor-pointer items-center gap-1.5 rounded px-1 py-1.5 transition-colors hover:bg-(--gql-hover)"
                    @click="selectItem(item)"
                >
                    <button
                        class="shrink-0 text-(--gql-text-secondary) hover:text-yellow-400"
                        title="Favorite"
                        @click.stop="toggleFavorite(item, index)"
                    >
                        <Icon
                            name="star-outline"
                            class="h-3.5 w-3.5"
                        />
                    </button>
                    <span class="flex-1 truncate text-xs text-(--gql-text)">{{
                        getItemLabel(item)
                    }}</span>
                    <button
                        class="shrink-0 text-(--gql-text-secondary) opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                        @click.stop="deleteItem(item)"
                    >
                        <Icon
                            name="close"
                            class="h-3 w-3"
                        />
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
