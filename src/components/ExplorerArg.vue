<script setup lang="ts">
import { computed, ref } from 'vue';
import {
    Kind,
    isEnumType,
    isInputObjectType,
    isScalarType,
    isNonNullType,
    getNamedType,
    getTypeName,
    coerceArgValue,
    getDefaultValueForType,
    printArgValue,
    type GraphQLSchema,
    type GraphQLArgument,
    type FieldNode,
    type ArgumentNode,
    type ValueNode,
    type GraphQLEnumType,
    type GraphQLInputObjectType,
    type GraphQLScalarType,
} from '../utils';

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
    return props.fieldSelection.arguments.find(
        (a) => a.name.value === props.arg.name,
    ) ?? null;
});

const isActive = computed(() => !!argNode.value);

const currentValue = computed(() => {
    if (!argNode.value) return '';
    return printArgValue(argNode.value.value);
});

// Type checks
const isEnum = computed(() => namedType.value ? isEnumType(namedType.value) : false);
const isBoolean = computed(() => namedType.value ? isScalarType(namedType.value) && namedType.value.name === 'Boolean' : false);
const isInputObject = computed(() => namedType.value ? isInputObjectType(namedType.value) : false);
const isScalar = computed(() => namedType.value ? isScalarType(namedType.value) : false);

// Get enum values for dropdown
const enumValues = computed(() => {
    if (!isEnum.value || !namedType.value) return [];
    return (namedType.value as GraphQLEnumType).getValues().map(v => v.value);
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
    const existing = props.fieldSelection.arguments ? [...props.fieldSelection.arguments] : [];
    emit('update:arguments', [...existing, newArg]);
}

function removeArg() {
    const args = (props.fieldSelection.arguments ?? []).filter(
        (a) => a.name.value !== props.arg.name,
    );
    emit('update:arguments', args);
}

function updateValue(newValue: ValueNode) {
    const args = (props.fieldSelection.arguments ?? []).map((a) =>
        a.name.value === props.arg.name ? { ...a, value: newValue } : a,
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
        f.name.value === fieldName ? { ...f, value } : f,
    );
    updateValue({ kind: Kind.OBJECT, fields } as any);
}
</script>

<template>
    <div class="explorer-arg py-0.5">
        <div class="flex items-center gap-1">
            <!-- Toggle checkbox -->
            <button
                class="flex items-center justify-center w-3 h-3 shrink-0"
                @click="toggleArg"
            >
                <svg v-if="isActive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3 text-[var(--gql-primary)]">
                    <path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 01.208 1.04l-5 7.5a.75.75 0 01-1.154.114l-3-3a.75.75 0 011.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 011.04-.207z" clip-rule="evenodd" />
                </svg>
                <div v-else class="w-2.5 h-2.5 rounded-sm border border-[var(--gql-border)]" />
            </button>

            <!-- Arg name -->
            <span
                class="text-[var(--gql-arg)] cursor-pointer"
                :class="{ 'font-medium': isRequired }"
                @click="toggleArg"
            >{{ arg.name }}<span v-if="isRequired" class="text-red-400">*</span></span>

            <!-- Value input (only when active) -->
            <template v-if="isActive">
                <span class="text-[var(--gql-text-secondary)]">:</span>

                <!-- Boolean select -->
                <select
                    v-if="isBoolean"
                    :value="currentValue"
                    class="gql-arg-input text-[var(--gql-text)]"
                    @change="onBooleanSelect"
                >
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>

                <!-- Enum select -->
                <select
                    v-else-if="isEnum"
                    :value="currentValue"
                    class="gql-arg-input text-[var(--gql-text)]"
                    @change="onEnumSelect"
                >
                    <option v-for="v in enumValues" :key="v" :value="v">{{ v }}</option>
                </select>

                <!-- Scalar input -->
                <input
                    v-else-if="isScalar && !isInputObject"
                    :value="currentValue"
                    :placeholder="arg.name"
                    class="gql-arg-input text-[var(--gql-string)]"
                    :style="{ width: Math.max(40, Math.min(200, (currentValue.length + 1) * 7)) + 'px' }"
                    @input="onScalarInput"
                />
            </template>

            <!-- Type hint -->
            <span class="text-[var(--gql-text-secondary)] text-[10px] ml-auto opacity-60">
                {{ getTypeName(arg.type) }}
            </span>
        </div>

        <!-- Input object fields (nested) -->
        <div v-if="isActive && isInputObject && argNode?.value?.kind === Kind.OBJECT" class="pl-4 border-l border-[var(--gql-border)] ml-1.5 mt-0.5">
            <div v-for="field in inputObjectFields" :key="field.name" class="flex items-center gap-1 py-0.5">
                <span class="text-[var(--gql-arg)]">{{ field.name }}:</span>
                <input
                    :value="getInputObjectFieldValue(argNode!.value, field.name)"
                    :placeholder="field.name"
                    class="gql-arg-input text-[var(--gql-string)]"
                    @input="(e: any) => onInputObjectFieldChange(field.name, coerceArgValue(field.type, (e.target as HTMLInputElement).value))"
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
