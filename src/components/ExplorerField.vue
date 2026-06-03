<script setup lang="ts">
import type {
    FieldNode,
    GraphQLField,
    GraphQLSchema,
    SelectionSetNode,
} from '~/src/utils';

import { computed, ref } from 'vue';

import {
    Kind,
    getFields,
    isLeafType,
    getTypeName,
    isUnionType,
    getNamedType,
    isObjectLikeType,
} from '~/src/utils';

import ExplorerArg from '~/src/components/ExplorerArg.vue';

const props = defineProps<{
    field: GraphQLField<any, any>;
    schema: GraphQLSchema;
    selections: readonly any[];
    depth: number;
}>();

const emit = defineEmits<{
    (e: 'update:selections', selections: readonly any[]): void;
}>();

const maxDepth = 10;

// Find if this field is currently selected in the parent's selections
const fieldSelection = computed<FieldNode | null>(() => {
    for (const sel of props.selections) {
        if (sel.kind === Kind.FIELD && sel.name.value === props.field.name) {
            return sel;
        }
    }
    return null;
});

const isSelected = computed(() => !!fieldSelection.value);

const namedType = computed(() => getNamedType(props.field.type));
const hasSubFields = computed(() =>
    namedType.value ? isObjectLikeType(namedType.value) : false
);
const isLeaf = computed(() => (namedType.value ? isLeafType(namedType.value) : true));
const typeDisplay = computed(() => getTypeName(props.field.type));
const childFields = computed(() => {
    if (!namedType.value) return {};
    return getFields(namedType.value) ?? {};
});

// Arguments
const fieldArgs = computed(() => props.field.args ?? []);

// Child selections from the field's selectionSet
const childSelections = computed<readonly any[]>(() => {
    return fieldSelection.value?.selectionSet?.selections ?? [];
});

// For union/interface types, get possible types
const possibleTypes = computed(() => {
    if (!namedType.value) return [];
    if (isUnionType(namedType.value)) return namedType.value.getTypes();
    return [];
});

// Expand/collapse for object types
const isExpanded = ref(false);

// When clicking the field checkbox/name
function toggleField() {
    if (isSelected.value) {
        // Remove field from selections
        const newSelections = props.selections.filter(
            (s) => !(s.kind === Kind.FIELD && s.name.value === props.field.name)
        );
        emit('update:selections', newSelections);
    } else {
        // Add field to selections
        const newField = createFieldNode();
        emit('update:selections', [...props.selections, newField]);
        if (hasSubFields.value) {
            isExpanded.value = true;
        }
    }
}

function createFieldNode(): FieldNode {
    const node: any = {
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: props.field.name },
        arguments: [],
    };

    if (hasSubFields.value && namedType.value) {
        const fields = getFields(namedType.value);
        if (fields) {
            const defaultFieldNames = getDefaultFieldNamesForType(fields);
            node.selectionSet = {
                kind: Kind.SELECTION_SET,
                selections: defaultFieldNames.map((name: string) => ({
                    kind: Kind.FIELD,
                    name: { kind: Kind.NAME, value: name },
                    arguments: [],
                })),
            };
        }
    }

    return node;
}

function getDefaultFieldNamesForType(
    fields: Record<string, GraphQLField<any, any>>
): string[] {
    const fieldNames = Object.keys(fields);
    if (fieldNames.includes('id')) return ['id'];
    if (fieldNames.includes('edges')) return ['edges'];
    if (fieldNames.includes('node')) return ['node'];
    const leafFields = fieldNames.filter((n) => {
        const named = getNamedType(fields[n].type);
        return named ? isLeafType(named) : false;
    });
    return leafFields.length > 0 ? leafFields.slice(0, 2) : ['__typename'];
}

// When child selections change
function onChildSelectionsChange(newChildSelections: readonly any[]) {
    if (!fieldSelection.value) return;

    const updatedField: FieldNode = {
        ...fieldSelection.value,
        selectionSet:
            newChildSelections.length > 0
                ? ({
                      kind: Kind.SELECTION_SET,
                      selections: newChildSelections,
                  } as SelectionSetNode)
                : undefined,
    } as FieldNode;

    const newSelections = props.selections.map((s) =>
        s === fieldSelection.value ? updatedField : s
    );
    emit('update:selections', newSelections);
}

// When arguments change
function onArgumentsChange(newArgs: readonly any[]) {
    if (!fieldSelection.value) return;

    const updatedField: FieldNode = {
        ...fieldSelection.value,
        arguments: newArgs as any,
    };

    const newSelections = props.selections.map((s) =>
        s === fieldSelection.value ? updatedField : s
    );
    emit('update:selections', newSelections);
}

// Toggle expand for object types
function onArrowClick() {
    if (!isSelected.value) {
        toggleField();
    } else {
        isExpanded.value = !isExpanded.value;
    }
}

// Auto-expand when selected
const showChildren = computed(
    () => isSelected.value && hasSubFields.value && (isExpanded.value || props.depth < 1)
);
</script>

<template>
    <div class="explorer-field">
        <!-- Field row -->
        <div
            class="group flex cursor-pointer items-center gap-0.5 rounded px-1 py-0.5 hover:bg-(--gql-hover)"
            :style="{ paddingLeft: `${depth * 12 + 4}px` }"
        >
            <!-- Arrow for object types -->
            <button
                v-if="hasSubFields"
                class="flex h-4 w-4 shrink-0 items-center justify-center text-(--gql-text-secondary)"
                @click.stop="onArrowClick"
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="h-3 w-3 transition-transform duration-150"
                    :class="showChildren ? 'rotate-90' : ''"
                >
                    <path
                        fill-rule="evenodd"
                        d="M6.22 4.22a.75.75 0 011.06 0l3.25 3.25a.75.75 0 010 1.06l-3.25 3.25a.75.75 0 01-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 010-1.06z"
                        clip-rule="evenodd"
                    />
                </svg>
            </button>

            <!-- Checkbox for leaf types -->
            <button
                v-else
                class="flex h-4 w-4 shrink-0 items-center justify-center"
                @click.stop="toggleField"
            >
                <svg
                    v-if="isSelected"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    class="h-3.5 w-3.5 text-(--gql-primary)"
                >
                    <path
                        fill-rule="evenodd"
                        d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z"
                        clip-rule="evenodd"
                    />
                </svg>
                <div
                    v-else
                    class="h-3 w-3 rounded-sm border border-(--gql-border)"
                />
            </button>

            <!-- Field name -->
            <button
                class="truncate text-left text-(--gql-field) hover:underline"
                @click="toggleField"
            >
                {{ field.name }}
            </button>

            <!-- Type hint -->
            <span
                class="ml-auto shrink-0 truncate text-[10px] text-(--gql-text-secondary) opacity-0 transition-opacity group-hover:opacity-100"
            >
                {{ typeDisplay }}
            </span>
        </div>

        <!-- Arguments (shown when field is selected) -->
        <div
            v-if="isSelected && fieldArgs.length > 0"
            :style="{ paddingLeft: `${(depth + 1) * 12 + 4}px` }"
        >
            <ExplorerArg
                v-for="arg in fieldArgs"
                :key="arg.name"
                :arg="arg"
                :schema="schema"
                :field-selection="fieldSelection!"
                @update:arguments="onArgumentsChange"
            />
        </div>

        <!-- Child fields (recursive, for object types) -->
        <div v-if="showChildren && depth < maxDepth">
            <ExplorerField
                v-for="(childField, childFieldName) in childFields"
                :key="String(childFieldName)"
                :field="childField"
                :schema="schema"
                :selections="childSelections"
                :depth="depth + 1"
                @update:selections="onChildSelectionsChange"
            />

            <!-- Union possible types -->
            <div
                v-for="possibleType in possibleTypes"
                :key="possibleType.name"
                class="mt-1"
            >
                <div
                    class="text-[10px] text-(--gql-text-secondary) italic"
                    :style="{ paddingLeft: `${(depth + 1) * 12 + 4}px` }"
                >
                    ... on {{ possibleType.name }}
                </div>
                <ExplorerField
                    v-for="(ptField, ptFieldName) in possibleType.getFields()"
                    :key="possibleType.name + '.' + String(ptFieldName)"
                    :field="ptField"
                    :schema="schema"
                    :selections="childSelections"
                    :depth="depth + 2"
                    @update:selections="onChildSelectionsChange"
                />
            </div>
        </div>
    </div>
</template>
