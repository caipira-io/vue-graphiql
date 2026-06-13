<script lang="ts" setup>
import useSplitGutter from '~/src/composables/useSplitGutter';

const props = defineProps<{
    type: 'column' | 'row';
}>();

const emit = defineEmits<{
    (e: 'mouseup'): void;
}>();

const { activeGutterId, gutterId } = useSplitGutter(() => emit('mouseup'));
const id = `gutter-${gutterId}`;

const onMouseDown = () => {
    activeGutterId.value = gutterId;
};

const getElement = (): HTMLElement => document.querySelector(`#${id}`) as HTMLElement;

defineExpose({ getElement });
</script>

<template>
    <div
        :id="id"
        class="bg-(--gql-border) relative"
        :class="{
            'bg-blue-500': activeGutterId === gutterId,
            'sg-gutter-col cursor-col-resize': type === 'column',
            'sg-gutter-row cursor-row-resize': type === 'row',
        }"
        @mousedown="onMouseDown"
    />
</template>

<style scoped>
.sg-gutter-col::before {
    content: '';
    position: absolute;
    right: -7px;
    top: 0;
    width: 15px;
    height: 100%;
}

.sg-gutter-row::before {
    content: '';
    position: absolute;
    top: -7px;
    left: 0;
    width: 100%;
    height: 15px;
}
</style>
