<script setup lang="ts">
import { watch, ref } from 'vue';

const props = withDefaults(
    defineProps<{
        name: string;
    }>(),
    {}
);

const content = ref<string>('');

const refreshContent = async (): Promise<string> => {
    const content = await import(`../../assets/icons/${props.name}.svg?raw`);

    return content.default;
};

watch(
    () => props.name,
    async (newIcon, oldIcon) => {
        if (newIcon === oldIcon) {
            return;
        }

        content.value = await refreshContent();
    },
    { immediate: true }
);
</script>

<template>
    <i
        v-html="content"
        class="inline-flex items-center justify-center"
    />
</template>
