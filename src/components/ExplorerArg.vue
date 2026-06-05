<script setup lang="ts">
import type {
    FieldNode,
    ValueNode,
    ArgumentNode,
    GraphQLSchema,
    GraphQLArgument,
    GraphQLEnumType,
    GraphQLInputObjectType,
} from '~/src/utils';

import { computed } from 'vue';

import {
    Kind,
    isEnumType,
    getTypeName,
    getNamedType,
    isScalarType,
    isNonNullType,
    printArgValue,
    coerceArgValue,
    isInputObjectType,
    getDefaultValueForType,
} from '~/src/utils';

import Icon from '~/src/components/Icon.vue';

const props = defineProps<{
    arg: GraphQLArgument;
    schema: GraphQLSchema;
    fieldSelection: FieldNode;
}>();

const emit = defineEmits<{
    (e: 'update:arguments', args: readonly any[]): void;
}>();

const namedType = computed(() => getNamedType(props.arg.type));
const isRequired = computed(() => isNonNullType(props.arg.type));

// Find existing argument value in the field selection
const argNode = computed<ArgumentNode | null>(() => {
    if (!props.fieldSelection.arguments) return null;
    return (
        props.fieldSelection.arguments.find((a) => a.name.value === props.arg.name) ??
        null
    );
});

const isActive = computed(() => !!argNode.value);

const currentValue = computed(() => {
    if (!argNode.value) return '';
    return printArgValue(argNode.value.value);
});

// Type checks
const isEnum = computed(() => (namedType.value ? isEnumType(namedType.value) : false));
const isBoolean = computed(() =>
    namedType.value
        ? isScalarType(namedType.value) && namedType.value.name === 'Boolean'
        : false
);
const isInputObject = computed(() =>
    namedType.value ? isInputObjectType(namedType.value) : false
);
const isScalar = computed(() =>
    namedType.value ? isScalarType(namedType.value) : false
);

// Get enum values for dropdown
const enumValues = computed(() => {
    if (!isEnum.value || !namedType.value) return [];
    return (namedType.value as GraphQLEnumType).getValues().map((v) => v.value);
});

// Get input object fields for nested rendering
const inputObjectFields = computed(() => {
    if (!isInputObject.value || !namedType.value) return [];
    return Object.values((namedType.value as GraphQLInputObjectType).getFields());
});

function toggleArg() {
    if (isActive.value) {
        removeArg();
    } else {
        addArg();
    }
}

function addArg() {
    const newArg: ArgumentNode = {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: props.arg.name },
        value: getDefaultValueForType(props.arg.type),
    };
    const existing = props.fieldSelection.arguments
        ? [...props.fieldSelection.arguments]
        : [];
    emit('update:arguments', [...existing, newArg]);
}

function removeArg() {
    const args = (props.fieldSelection.arguments ?? []).filter(
        (a) => a.name.value !== props.arg.name
    );
    emit('update:arguments', args);
}

function updateValue(newValue: ValueNode) {
    const args = (props.fieldSelection.arguments ?? []).map((a) =>
        a.name.value === props.arg.name ? { ...a, value: newValue } : a
    );
    emit('update:arguments', args);
}

function onScalarInput(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    updateValue(coerceArgValue(props.arg.type, val));
}

function onEnumSelect(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    updateValue({ kind: Kind.ENUM, value: val });
}

function onBooleanSelect(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    updateValue({ kind: Kind.BOOLEAN, value: val === 'true' });
}

// Input object field handling
function onInputObjectFieldChange(fieldName: string, value: ValueNode) {
    if (!argNode.value || argNode.value.value.kind !== Kind.OBJECT) return;
    const fields = argNode.value.value.fields.map((f: any) =>
        f.name.value === fieldName ? { ...f, value } : f
    );
    updateValue({ kind: Kind.OBJECT, fields } as any);
}
</script>

<template>
    <div class="explorer-arg py-0.5">
        <div class="flex items-center gap-1">
            <!-- Toggle checkbox -->
            <button
                class="flex h-3 w-3 shrink-0 items-center justify-center"
                @click="toggleArg"
            >
                <Icon
                    v-if="isActive"
                    name="check"
                    class="h-3 w-3 text-(--gql-primary)"
                />
                <div
                    v-else
                    class="h-2.5 w-2.5 rounded-sm border border-(--gql-border)"
                />
            </button>

            <!-- Arg name -->
            <span
                class="cursor-pointer text-(--gql-arg)"
                :class="{ 'font-medium': isRequired }"
                @click="toggleArg"
                >{{ arg.name
                }}<span
                    v-if="isRequired"
                    class="text-red-400"
                    >*</span
                ></span
            >

            <!-- Value input (only when active) -->
            <template v-if="isActive">
                <span class="text-(--gql-text-secondary)">:</span>

                <!-- Boolean select -->
                <select
                    v-if="isBoolean"
                    :value="currentValue"
                    class="gql-arg-input text-(--gql-text)"
                    @change="onBooleanSelect"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>

                <!-- Enum select -->
                <select
                    v-else-if="isEnum"
                    :value="currentValue"
                    class="gql-arg-input text-(--gql-text)"
                    @change="onEnumSelect"
                >
                    <option
                        v-for="v in enumValues"
                        :key="v"
                        :value="v"
                    >
                        {{ v }}
                    </option>
                </select>

                <!-- Scalar input -->
                <input
                    v-else-if="isScalar && !isInputObject"
                    :value="currentValue"
                    :placeholder="arg.name"
                    class="gql-arg-input text-(--gql-string)"
                    :style="{
                        width:
                            Math.max(40, Math.min(200, (currentValue.length + 1) * 7)) +
                            'px',
                    }"
                    @input="onScalarInput"
                />
            </template>

            <!-- Type hint -->
            <span class="ml-auto text-[10px] text-(--gql-text-secondary) opacity-60">
                {{ getTypeName(arg.type) }}
            </span>
        </div>

        <!-- Input object fields (nested) -->
        <div
            v-if="isActive && isInputObject && argNode?.value?.kind === Kind.OBJECT"
            class="mt-0.5 ml-1.5 border-l border-(--gql-border) pl-4"
        >
            <div
                v-for="field in inputObjectFields"
                :key="field.name"
                class="flex items-center gap-1 py-0.5"
            >
                <span class="text-(--gql-arg)">{{ field.name }}:</span>
                <input
                    :value="getInputObjectFieldValue(argNode!.value, field.name)"
                    :placeholder="field.name"
                    class="gql-arg-input text-(--gql-string)"
                    @input="
                        (e: any) =>
                            onInputObjectFieldChange(
                                field.name,
                                coerceArgValue(
                                    field.type,
                                    (e.target as HTMLInputElement).value
                                )
                            )
                    "
                />
            </div>
        </div>
    </div>
</template>

<script lang="ts">
function getInputObjectFieldValue(objectValue: any, fieldName: string): string {
    if (!objectValue || objectValue.kind !== Kind.OBJECT) return '';
    const field = objectValue.fields?.find((f: any) => f.name.value === fieldName);
    if (!field) return '';
    return printArgValue(field.value);
}
</script>
