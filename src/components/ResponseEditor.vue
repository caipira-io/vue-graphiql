<script setup lang="ts">
import { inject } from 'vue';

import { GRAPHIQL_STORE_KEY } from '@/src/store';

import MonacoEditor from '@/src/components/MonacoEditor.vue';

const store = inject(GRAPHIQL_STORE_KEY)!;

const uri = `${store.instanceId}response.json`;

function onEditorMounted(editor: any) {
    store.editors.response = editor;
}
</script>

<template>
    <MonacoEditor
        language="json"
        :value="store.activeTab.value?.response ?? ''"
        :uri="uri"
        :read-only="true"
        :line-numbers="false"
        :word-wrap="true"
        @mounted="onEditorMounted"
    />
</template>
