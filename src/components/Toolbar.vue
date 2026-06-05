<script setup lang="ts">
import { inject } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';

import Icon from '~/src/components/Icon.vue';

const store = inject(GRAPHIQL_STORE_KEY)!;
</script>

<template>
    <div class="flex flex-col items-center gap-1.5 py-2">
        <!-- Prettify -->
        <button
            title="Prettify (Ctrl+Shift+P)"
            class="flex h-7 w-7 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            @click="store.prettify()"
        >
            <Icon
                name="auto-fix"
                class="h-4 w-4"
            />
        </button>

        <!-- Merge -->
        <button
            title="Merge Fragments (Ctrl+Shift+M)"
            class="flex h-7 w-7 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            @click="store.mergeFragments()"
        >
            <Icon
                name="format-align-middle"
                class="h-4 w-4"
            />
        </button>

        <!-- Copy -->
        <button
            title="Copy Query (Ctrl+Shift+C)"
            class="flex h-7 w-7 items-center justify-center rounded text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
            @click="store.copyQuery()"
        >
            <Icon
                name="content-copy"
                class="h-4 w-4"
            />
        </button>
    </div>
</template>
