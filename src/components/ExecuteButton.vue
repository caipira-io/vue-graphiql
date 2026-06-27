<script setup lang="ts">
import { inject, ref, computed } from 'vue';

import { GRAPHIQL_STORE_KEY } from '@/src/store';

import Icon from '@/src/components/Icon.vue';

const store = inject(GRAPHIQL_STORE_KEY)!;

const showDropdown = ref(false);

const isRunning = computed(() => store.isFetching.value || !!store.subscription.value);
const hasMultipleOps = computed(() => store.operations.value.length > 1);

function handleClick() {
    if (isRunning.value) {
        store.stop();
        return;
    }
    if (hasMultipleOps.value && !store.operationName.value) {
        showDropdown.value = !showDropdown.value;
        return;
    }
    store.run();
}

function runOperation(name: string | null) {
    showDropdown.value = false;
    store.run(name ?? undefined);
}
</script>

<template>
    <div class="relative">
        <button
            :title="isRunning ? 'Stop' : 'Execute Query (Ctrl+Enter)'"
            class="flex items-center justify-center w-10 h-10 rounded-full shadow-md transition-all duration-200"
            :class="
                isRunning
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-(--gql-primary) hover:brightness-110 text-white'
            "
            @click="handleClick"
        >
            <Icon
                v-if="!isRunning"
                name="play"
                class="w-5 h-5 ml-0.5"
            />
            <Icon
                v-else
                name="stop"
                class="w-5 h-5"
            />
        </button>

        <!-- Operation dropdown -->
        <div
            v-if="showDropdown && hasMultipleOps"
            class="absolute top-full left-1/2 -translate-x-1/2 mt-1 z-10 bg-(--gql-primary) border border-(--gql-border) rounded-lg shadow-xl py-1 min-w-40"
        >
            <button
                v-for="op in store.operations.value"
                :key="op.name?.value ?? 'anonymous'"
                class="w-full px-3 py-1.5 text-left text-sm text-(--gql-text) hover:bg-(--gql-hover) transition-colors"
                @click="runOperation(op.name?.value ?? null)"
            >
                {{ op.name?.value ?? '(anonymous)' }}
            </button>
        </div>

        <!-- Click-outside to close dropdown -->
        <div
            v-if="showDropdown"
            class="fixed inset-0 z-9"
            @click="showDropdown = false"
        />
    </div>
</template>
