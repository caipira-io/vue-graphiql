<script setup lang="ts">
import { inject } from 'vue';
import { GRAPHIQL_STORE_KEY } from '../types';

const store = inject(GRAPHIQL_STORE_KEY)!;
</script>

<template>
    <div class="flex flex-col items-center gap-1.5 py-2">
        <!-- Prettify -->
        <button
            title="Prettify (Ctrl+Shift+P)"
            class="flex items-center justify-center w-7 h-7 rounded text-[var(--gql-text-secondary)] hover:text-[var(--gql-text)] hover:bg-[var(--gql-hover)] transition-colors"
            @click="store.prettify()"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M2 3.75A.75.75 0 012.75 3h11.5a.75.75 0 010 1.5H2.75A.75.75 0 012 3.75zM2 7.5a.75.75 0 01.75-.75h7.508a.75.75 0 010 1.5H2.75A.75.75 0 012 7.5zM14 7a.75.75 0 01.75.75v6.59l1.95-2.1a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 111.1-1.02l1.95 2.1V7.75A.75.75 0 0114 7zM2 11.25a.75.75 0 01.75-.75h4.562a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75z" clip-rule="evenodd" />
            </svg>
        </button>

        <!-- Merge -->
        <button
            title="Merge Fragments (Ctrl+Shift+M)"
            class="flex items-center justify-center w-7 h-7 rounded text-[var(--gql-text-secondary)] hover:text-[var(--gql-text)] hover:bg-[var(--gql-hover)] transition-colors"
            @click="store.mergeFragments()"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path fill-rule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.375 2.12l-.708.709a6.5 6.5 0 0011.094-2.83h-1.011zm-10.624-2.85a5.5 5.5 0 019.375-2.12l.708-.709A6.5 6.5 0 003.677 8.576h1.011z" clip-rule="evenodd" />
            </svg>
        </button>

        <!-- Copy -->
        <button
            title="Copy Query (Ctrl+Shift+C)"
            class="flex items-center justify-center w-7 h-7 rounded text-[var(--gql-text-secondary)] hover:text-[var(--gql-text)] hover:bg-[var(--gql-hover)] transition-colors"
            @click="store.copyQuery()"
        >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4">
                <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.44A1.5 1.5 0 008.378 6H4.5z" />
            </svg>
        </button>
    </div>
</template>
