<script setup lang="ts">
import { ref } from 'vue';
import { GraphiQL } from '../index';
import '../src/style.css';

const theme = ref<'light' | 'dark'>('dark');

function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
}

const URL = import.meta.env.VITE_GRAPHQL_URL;
</script>

<template>
    <div
        class="app-wrapper"
        :class="theme"
    >
        <div class="theme-toggle">
            <button @click="toggleTheme">
                {{ theme === 'dark' ? 'Light' : 'Dark' }} Mode
            </button>
        </div>
        <div class="graphiql-wrapper">
            <GraphiQL
                :url="URL"
                :theme="theme"
                namespace="dev"
                :initial-query="initialQuery"
            />
        </div>
    </div>
</template>

<script lang="ts">
const initialQuery = `
# Welcome! Try running a query.
#
# Use the Explorer on the left to browse the schema
# and build queries by clicking fields.
#
# Press Ctrl+Enter to execute.

{
  __typename
}
`;
</script>

<style>
.app-wrapper {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100vh;
}

.app-wrapper.dark {
    background: #0d1117;
    color: #e6edf3;
}

.app-wrapper.light {
    background: #fff;
    color: #1f2937;
}

.theme-toggle {
    display: flex;
    justify-content: flex-end;
    padding: 6px 12px;
    flex-shrink: 0;
}

.theme-toggle button {
    padding: 4px 12px;
    border-radius: 4px;
    border: 1px solid #555;
    background: transparent;
    color: inherit;
    cursor: pointer;
    font-size: 12px;
}

.theme-toggle button:hover {
    background: rgba(128, 128, 128, 0.2);
}

.graphiql-wrapper {
    flex: 1;
    min-height: 0;
}
</style>
