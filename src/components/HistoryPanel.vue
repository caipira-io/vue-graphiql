<script setup lang="ts">
import { inject, ref, computed, watch, onMounted } from 'vue';
import { GRAPHIQL_STORE_KEY, type HistoryItem } from '../types';

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
            historyItems.value = Array.isArray(parsed.queries) ? parsed.queries : (Array.isArray(parsed) ? parsed : []);
        }
    } catch { historyItems.value = []; }
    try {
        const raw = store.storage.get('favorites');
        if (raw) {
            const parsed = JSON.parse(raw);
            favoriteItems.value = Array.isArray(parsed.favorites) ? parsed.favorites : (Array.isArray(parsed) ? parsed : []);
        }
    } catch { favoriteItems.value = []; }
}

function saveHistory() {
    store.storage.set('queries', JSON.stringify({ queries: historyItems.value }));
    store.storage.set('favorites', JSON.stringify({ favorites: favoriteItems.value }));
}

function addToHistory(item: HistoryItem) {
    // Don't add if same as most recent
    const last = historyItems.value[historyItems.value.length - 1];
    if (last && last.query === item.query && last.variables === item.variables && last.headers === item.headers) {
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
        const idx = favoriteItems.value.findIndex(f =>
            f.query === item.query && f.variables === item.variables);
        if (idx >= 0) favoriteItems.value.splice(idx, 1);
        historyItems.value.push({ ...item, favorite: false });
    } else {
        // Favorite: move from history to favorites
        const idx = historyItems.value.findIndex(h =>
            h.query === item.query && h.variables === item.variables);
        if (idx >= 0) historyItems.value.splice(idx, 1);
        favoriteItems.value.push({ ...item, favorite: true });
    }
    saveHistory();
}

function deleteItem(item: HistoryItem) {
    if (item.favorite) {
        favoriteItems.value = favoriteItems.value.filter(f =>
            !(f.query === item.query && f.variables === item.variables));
    } else {
        historyItems.value = historyItems.value.filter(h =>
            !(h.query === item.query && h.variables === item.variables));
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
    const match = item.query.match(/^(?!#).*(query|subscription|mutation)\s+([a-zA-Z0-9_]+)/m);
    return match ? match[2] : '<untitled>';
}

// Record queries when execution starts
watch(() => store.isFetching.value, (fetching) => {
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
});

onMounted(loadHistory);
</script>

<template>
    <div class="flex flex-col h-full">
        <div class="flex-1 overflow-auto">
            <div v-if="allItems.length === 0" class="px-3 py-4 text-xs text-[var(--gql-text-secondary)] italic text-center">
                No history yet. Execute a query to see it here.
            </div>

            <!-- Favorites -->
            <div v-if="favoriteItems.length > 0" class="px-3 py-2">
                <h4 class="text-[10px] font-semibold text-[var(--gql-text-secondary)] uppercase tracking-wider mb-1">Favorites</h4>
                <div
                    v-for="(item, index) in favoriteItems"
                    :key="'fav-' + index"
                    class="group flex items-center gap-1.5 py-1.5 px-1 rounded hover:bg-[var(--gql-hover)] cursor-pointer transition-colors"
                    @click="selectItem(item)"
                >
                    <button
                        class="shrink-0 text-yellow-400"
                        title="Unfavorite"
                        @click.stop="toggleFavorite(item, index)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-3.5 h-3.5">
                            <path fill-rule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clip-rule="evenodd" />
                        </svg>
                    </button>
                    <span class="text-xs text-[var(--gql-text)] truncate flex-1">{{ getItemLabel(item) }}</span>
                    <button
                        class="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--gql-text-secondary)] hover:text-red-400 transition-opacity"
                        @click.stop="deleteItem(item)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                            <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                        </svg>
                    </button>
                </div>
            </div>

            <!-- History -->
            <div v-if="historyItems.length > 0" class="px-3 py-2">
                <div class="flex items-center justify-between mb-1">
                    <h4 class="text-[10px] font-semibold text-[var(--gql-text-secondary)] uppercase tracking-wider">History</h4>
                    <button
                        class="text-[10px] text-[var(--gql-text-secondary)] hover:text-red-400 transition-colors"
                        @click="clearHistory"
                    >Clear</button>
                </div>
                <div
                    v-for="(item, index) in [...historyItems].reverse()"
                    :key="'hist-' + index"
                    class="group flex items-center gap-1.5 py-1.5 px-1 rounded hover:bg-[var(--gql-hover)] cursor-pointer transition-colors"
                    @click="selectItem(item)"
                >
                    <button
                        class="shrink-0 text-[var(--gql-text-secondary)] hover:text-yellow-400"
                        title="Favorite"
                        @click.stop="toggleFavorite(item, index)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" class="w-3.5 h-3.5">
                            <path d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" />
                        </svg>
                    </button>
                    <span class="text-xs text-[var(--gql-text)] truncate flex-1">{{ getItemLabel(item) }}</span>
                    <button
                        class="shrink-0 opacity-0 group-hover:opacity-100 text-[var(--gql-text-secondary)] hover:text-red-400 transition-opacity"
                        @click.stop="deleteItem(item)"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                            <path d="M5.28 4.22a.75.75 0 00-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 101.06 1.06L8 9.06l2.72 2.72a.75.75 0 101.06-1.06L9.06 8l2.72-2.72a.75.75 0 00-1.06-1.06L8 6.94 5.28 4.22z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
