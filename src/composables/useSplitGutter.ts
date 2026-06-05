import { onBeforeUnmount, ref } from 'vue';

let index = 0;

const activeGutterId = ref<number>(0);
const listeners = new Map<number, () => void>();

const onMouseUp = () => {
    if (activeGutterId.value === 0) {
        return;
    }

    activeGutterId.value = 0;

    listeners.forEach((listener) => listener());
};

window.addEventListener('mouseup', onMouseUp);

export default function useSplitGutter(mouseUpListener?: () => void) {
    index++;

    if (mouseUpListener) {
        listeners.set(index, mouseUpListener);
    }

    onBeforeUnmount(() => {
        if (mouseUpListener) {
            listeners.delete(index);
        }
    });

    return {
        activeGutterId,
        gutterId: index,
    };
}
