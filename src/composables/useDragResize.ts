import type { StorageWrapper } from '~/src/types';

import { ref, onMounted, onUnmounted } from 'vue';

import { debounce } from '~/src/utils';

export interface UseDragResizeOptions {
    direction: 'horizontal' | 'vertical';
    defaultSizeRelation?: number;
    initiallyHidden?: 'first' | 'second' | null;
    sizeThresholdFirst?: number;
    sizeThresholdSecond?: number;
    storageKey?: string;
    storage?: StorageWrapper | null;
    onHiddenElementChange?: (element: 'first' | 'second' | null) => void;
}

const HIDE_FIRST = 'hide-first';
const HIDE_SECOND = 'hide-second';

export function useDragResize(options: UseDragResizeOptions) {
    const {
        direction,
        defaultSizeRelation = 1,
        initiallyHidden = null,
        sizeThresholdFirst = 100,
        sizeThresholdSecond = 100,
        storageKey,
        storage,
        onHiddenElementChange,
    } = options;

    const firstRef = ref<HTMLElement | null>(null);
    const secondRef = ref<HTMLElement | null>(null);
    const dragBarRef = ref<HTMLElement | null>(null);
    const hiddenElement = ref<'first' | 'second' | null>(initiallyHidden);

    let storedFlexValue: number = defaultSizeRelation;

    // Debounced storage write
    const debouncedStore =
        storageKey && storage
            ? debounce((value: string) => storage.set(storageKey, value), 500)
            : null;

    function applyLayout() {
        const first = firstRef.value;
        const second = secondRef.value;
        const dragBar = dragBarRef.value;
        if (!first || !second) return;

        if (hiddenElement.value === 'first') {
            first.style.display = 'none';
            second.style.flex = '1';
            if (dragBar) dragBar.style.display = 'none';
        } else if (hiddenElement.value === 'second') {
            second.style.display = 'none';
            first.style.flex = '1';
        } else {
            first.style.display = '';
            second.style.display = '';
            first.style.flex = String(storedFlexValue);
            second.style.flex = '1';
            if (dragBar) dragBar.style.display = '';
        }
    }

    function setHiddenElement(element: 'first' | 'second' | null) {
        const prev = hiddenElement.value;
        hiddenElement.value = element;
        applyLayout();
        if (prev !== element) {
            onHiddenElementChange?.(element);
        }
        if (debouncedStore) {
            if (element === 'first') debouncedStore(HIDE_FIRST);
            else if (element === 'second') debouncedStore(HIDE_SECOND);
            else debouncedStore(String(storedFlexValue));
        }
    }

    onMounted(() => {
        // Restore from storage
        if (storageKey && storage) {
            const stored = storage.get(storageKey);
            if (stored === HIDE_FIRST) {
                hiddenElement.value = 'first';
            } else if (stored === HIDE_SECOND) {
                hiddenElement.value = 'second';
            } else if (stored) {
                const parsed = parseFloat(stored);
                if (!isNaN(parsed) && parsed > 0) {
                    storedFlexValue = parsed;
                    hiddenElement.value = null;
                }
            }
        }

        applyLayout();

        const dragBar = dragBarRef.value;
        if (!dragBar) return;

        let isDragging = false;
        let dragOffset = 0;

        function onMouseDown(e: MouseEvent) {
            e.preventDefault();
            isDragging = true;
            const rect = dragBar!.getBoundingClientRect();
            dragOffset =
                direction === 'horizontal' ? e.clientX - rect.left : e.clientY - rect.top;
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            document.body.style.cursor =
                direction === 'horizontal' ? 'col-resize' : 'row-resize';
            document.body.style.userSelect = 'none';
        }

        function onMouseMove(e: MouseEvent) {
            if (!isDragging) return;

            const first = firstRef.value;
            const second = secondRef.value;
            if (!first || !second) return;

            const parent = first.parentElement;
            if (!parent) return;

            const parentRect = parent.getBoundingClientRect();
            const isHorizontal = direction === 'horizontal';

            const mousePos = isHorizontal ? e.clientX : e.clientY;
            const parentStart = isHorizontal ? parentRect.left : parentRect.top;
            const parentSize = isHorizontal ? parentRect.width : parentRect.height;

            const firstSize = mousePos - parentStart - dragOffset;
            const secondSize = parentSize - firstSize;

            if (firstSize < sizeThresholdFirst) {
                setHiddenElement('first');
                return;
            }
            if (secondSize < sizeThresholdSecond) {
                setHiddenElement('second');
                return;
            }

            hiddenElement.value = null;
            storedFlexValue = firstSize / secondSize;
            first.style.display = '';
            second.style.display = '';
            first.style.flex = String(storedFlexValue);
            second.style.flex = '1';
            if (dragBar) dragBar.style.display = '';

            if (debouncedStore) {
                debouncedStore(String(storedFlexValue));
            }
        }

        function onMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        }

        function onDblClick() {
            storedFlexValue = defaultSizeRelation;
            hiddenElement.value = null;
            applyLayout();
            if (debouncedStore) {
                debouncedStore(String(storedFlexValue));
            }
        }

        dragBar.addEventListener('mousedown', onMouseDown);
        dragBar.addEventListener('dblclick', onDblClick);

        onUnmounted(() => {
            dragBar.removeEventListener('mousedown', onMouseDown);
            dragBar.removeEventListener('dblclick', onDblClick);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        });
    });

    return {
        firstRef,
        secondRef,
        dragBarRef,
        hiddenElement,
        setHiddenElement,
        applyLayout,
    };
}
