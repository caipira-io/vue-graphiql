<script setup lang="ts">
import '@/assets/styles/index.css';
import { ref } from 'vue';
import { GraphiQL } from '@/index';

const URL = import.meta.env.VITE_GRAPHQL_URL;
const theme = ref<'light' | 'dark'>('dark');
</script>

<template>
    <GraphiQL
        :url="URL"
        :theme="theme"
        namespace="dev"
        :initial-query="initialQuery"
    />
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
