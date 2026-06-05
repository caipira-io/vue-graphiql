<script setup lang="ts">
import type { DocExplorerNavItem } from '~/src/types';
import type {
    GraphQLField,
    GraphQLInputType,
    GraphQLNamedType,
    GraphQLOutputType,
} from '~/src/utils';

import { inject, ref, computed } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';
import {
    isEnumType,
    getTypeName,
    isUnionType,
    getNamedType,
    isObjectType,
    isScalarType,
    isInterfaceType,
    isInputObjectType,
} from '~/src/utils';

const store = inject(GRAPHIQL_STORE_KEY)!;

// Navigation stack
const navStack = ref<DocExplorerNavItem[]>([{ name: 'Schema' }]);

const currentItem = computed(() => navStack.value[navStack.value.length - 1]);

function push(item: DocExplorerNavItem) {
    navStack.value = [...navStack.value, item];
}

function pop() {
    if (navStack.value.length > 1) {
        navStack.value = navStack.value.slice(0, -1);
    }
}

// Search
const searchQuery = ref('');
const searchResults = computed(() => {
    if (!searchQuery.value || !store.schema.value) return [];
    const schema = store.schema.value;
    const query = searchQuery.value.toLowerCase();
    const typeMap = schema.getTypeMap();
    return Object.keys(typeMap)
        .filter((name) => !name.startsWith('__') && name.toLowerCase().includes(query))
        .sort()
        .slice(0, 20)
        .map((name) => typeMap[name]);
});

function displayType(type: GraphQLOutputType | GraphQLInputType): string {
    return getTypeName(type);
}

function navigateToType(type: GraphQLOutputType | GraphQLInputType) {
    const named = getNamedType(type);
    if (named) {
        push({ name: named.name, def: named });
        searchQuery.value = '';
    }
}

function navigateToField(field: GraphQLField<any, any>, parentType: GraphQLNamedType) {
    push({ name: field.name, def: { ...field, _parentType: parentType } });
}

// --- Schema view state ---
const schema = computed(() => store.schema.value);

const rootTypes = computed(() => {
    if (!schema.value) return [];
    const types: { label: string; type: GraphQLNamedType | null | undefined }[] = [];
    types.push({ label: 'Query', type: schema.value.getQueryType() });
    types.push({ label: 'Mutation', type: schema.value.getMutationType() });
    types.push({ label: 'Subscription', type: schema.value.getSubscriptionType() });
    return types.filter((t) => t.type);
});

const allSchemaTypes = computed(() => {
    if (!schema.value) return [];
    const typeMap = schema.value.getTypeMap();
    return Object.keys(typeMap)
        .filter((name) => !name.startsWith('__'))
        .sort()
        .map((name) => typeMap[name]);
});

// --- Type view state ---
const typeFields = computed(() => {
    const def = currentItem.value?.def;
    if (!def || def._parentType) return [];
    if (isObjectType(def) || isInterfaceType(def)) {
        return Object.values(def.getFields());
    }
    return [];
});

const typeEnumValues = computed(() => {
    const def = currentItem.value?.def;
    if (!def || def._parentType) return [];
    if (isEnumType(def)) return def.getValues();
    return [];
});

const typeInputFields = computed(() => {
    const def = currentItem.value?.def;
    if (!def || def._parentType) return [];
    if (isInputObjectType(def)) return Object.values(def.getFields());
    return [];
});

const typePossibleTypes = computed(() => {
    const def = currentItem.value?.def;
    if (!def || def._parentType) return [];
    if (isUnionType(def)) return def.getTypes();
    return [];
});

const typeInterfaces = computed(() => {
    const def = currentItem.value?.def;
    if (!def || def._parentType) return [];
    if (isObjectType(def)) return def.getInterfaces();
    return [];
});

const isScalar = computed(() => {
    const def = currentItem.value?.def;
    return def && !def._parentType && isScalarType(def);
});

const isEnum = computed(() => {
    const def = currentItem.value?.def;
    return def && !def._parentType && isEnumType(def);
});

// --- Field view state ---
const fieldArgs = computed(() => {
    const def = currentItem.value?.def;
    if (!def || !def._parentType) return [];
    return def.args ?? [];
});
</script>

<template>
    <div class="flex h-full flex-col">
        <!-- Header / Breadcrumb -->
        <div
            v-if="navStack.length > 1"
            class="flex items-center gap-1 border-b border-(--gql-border) px-3 py-2"
        >
            <button
                class="text-(--gql-primary) hover:underline"
                @click="pop()"
            >
                &larr; {{ navStack[navStack.length - 2].name }}
            </button>
        </div>

        <!-- Search (only on root) -->
        <div
            v-if="navStack.length === 1"
            class="border-b border-(--gql-border) px-3 py-2"
        >
            <input
                v-model="searchQuery"
                type="text"
                placeholder="Search types..."
                class="w-full rounded border border-(--gql-border) bg-(--gql-primary) px-2 py-1 text-(--gql-text) placeholder:text-(--gql-text-secondary) focus:border-(--gql-primary) focus:outline-none"
            />
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto px-3 py-2">
            <!-- Search results -->
            <div v-if="searchQuery && navStack.length === 1">
                <div
                    v-if="searchResults.length === 0"
                    class="text-(--gql-text-secondary) italic"
                >
                    No types found
                </div>
                <div
                    v-for="type in searchResults"
                    :key="type.name"
                    class="py-0.5"
                >
                    <button
                        class="text-(--gql-type) hover:underline"
                        @click="navigateToType(type as any)"
                    >
                        {{ type.name }}
                    </button>
                </div>
            </div>

            <!-- Schema root view -->
            <div v-else-if="!currentItem.def && schema">
                <div
                    v-if="schema.description"
                    class="mb-3"
                >
                    <p class="mb-2 text-(--gql-text-secondary)">
                        {{ schema.description }}
                    </p>
                </div>
                <div class="mb-3">
                    <h3 class="mb-1 font-semibold text-(--gql-text)">Root Types</h3>
                    <div
                        v-for="rt in rootTypes"
                        :key="rt.label"
                        class="py-0.5"
                    >
                        <span class="text-(--gql-text-secondary)">{{ rt.label }}: </span>
                        <button
                            class="text-(--gql-type) hover:underline"
                            @click="navigateToType(rt.type as any)"
                        >
                            {{ (rt.type as any).name }}
                        </button>
                    </div>
                </div>
                <div>
                    <h3 class="mb-1 font-semibold text-(--gql-text)">All Types</h3>
                    <div
                        v-for="type in allSchemaTypes"
                        :key="type.name"
                        class="py-0.5"
                    >
                        <button
                            class="text-(--gql-type) hover:underline"
                            @click="navigateToType(type as any)"
                        >
                            {{ type.name }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Type documentation -->
            <div v-else-if="currentItem.def && !currentItem.def._parentType">
                <h3 class="mb-1 text-sm font-semibold text-(--gql-text)">
                    {{ currentItem.def.name }}
                </h3>
                <p
                    v-if="currentItem.def.description"
                    class="mb-3 leading-relaxed text-(--gql-text-secondary)"
                >
                    {{ currentItem.def.description }}
                </p>

                <div
                    v-if="isScalar"
                    class="text-(--gql-text-secondary) italic"
                >
                    Scalar type
                </div>

                <div
                    v-if="isEnum && typeEnumValues.length"
                    class="mb-3"
                >
                    <h4 class="mb-1 font-medium text-(--gql-text)">Values</h4>
                    <div
                        v-for="v in typeEnumValues"
                        :key="v.value"
                        class="border-l-2 border-(--gql-border) py-1 pl-2"
                    >
                        <div class="font-mono text-(--gql-enum)">{{ v.value }}</div>
                        <div
                            v-if="v.description"
                            class="mt-0.5 text-(--gql-text-secondary)"
                        >
                            {{ v.description }}
                        </div>
                        <div
                            v-if="v.deprecationReason"
                            class="mt-0.5 text-[10px] text-orange-500"
                        >
                            Deprecated: {{ v.deprecationReason }}
                        </div>
                    </div>
                </div>

                <div
                    v-if="typeInterfaces.length > 0"
                    class="mb-3"
                >
                    <h4 class="mb-1 font-medium text-(--gql-text)">Implements</h4>
                    <span
                        v-for="(iface, i) in typeInterfaces"
                        :key="iface.name"
                    >
                        <button
                            class="text-(--gql-type) hover:underline"
                            @click="navigateToType(iface as any)"
                        >
                            {{ iface.name }}
                        </button>
                        <span
                            v-if="i < typeInterfaces.length - 1"
                            class="text-(--gql-text-secondary)"
                            >,
                        </span>
                    </span>
                </div>

                <div
                    v-if="typePossibleTypes.length > 0"
                    class="mb-3"
                >
                    <h4 class="mb-1 font-medium text-(--gql-text)">Possible Types</h4>
                    <div
                        v-for="pt in typePossibleTypes"
                        :key="pt.name"
                        class="py-0.5"
                    >
                        <button
                            class="text-(--gql-type) hover:underline"
                            @click="navigateToType(pt as any)"
                        >
                            {{ pt.name }}
                        </button>
                    </div>
                </div>

                <div
                    v-if="typeFields.length > 0"
                    class="mb-3"
                >
                    <h4 class="mb-1 font-medium text-(--gql-text)">Fields</h4>
                    <div
                        v-for="field in typeFields"
                        :key="field.name"
                        class="border-l-2 border-(--gql-border) py-1.5 pl-2"
                    >
                        <div>
                            <button
                                class="font-mono text-(--gql-field) hover:underline"
                                @click="navigateToField(field, currentItem.def)"
                            >
                                {{ field.name }}
                            </button>
                            <span
                                v-if="field.args?.length > 0"
                                class="text-(--gql-text-secondary)"
                                >(<!--
                                --><span
                                    v-for="(arg, i) in field.args"
                                    :key="arg.name"
                                    ><!--
                                    --><span class="text-(--gql-arg)">{{ arg.name }}</span
                                    >:
                                    <button
                                        class="text-(--gql-type) hover:underline"
                                        @click="navigateToType(arg.type)"
                                    >
                                        {{ displayType(arg.type) }}</button
                                    ><span v-if="i < field.args.length - 1">, </span
                                    ><!--
                                --></span
                                ><!--
                            -->)</span
                            >
                            <span class="text-(--gql-text-secondary)">: </span>
                            <button
                                class="text-(--gql-type) hover:underline"
                                @click="navigateToType(field.type)"
                            >
                                {{ displayType(field.type) }}
                            </button>
                        </div>
                        <div
                            v-if="field.description"
                            class="mt-0.5 text-(--gql-text-secondary)"
                        >
                            {{ field.description }}
                        </div>
                        <div
                            v-if="field.deprecationReason"
                            class="mt-0.5 text-[10px] text-orange-500"
                        >
                            Deprecated: {{ field.deprecationReason }}
                        </div>
                    </div>
                </div>

                <div
                    v-if="typeInputFields.length > 0"
                    class="mb-3"
                >
                    <h4 class="mb-1 font-medium text-(--gql-text)">Input Fields</h4>
                    <div
                        v-for="field in typeInputFields"
                        :key="field.name"
                        class="border-l-2 border-(--gql-border) py-1.5 pl-2"
                    >
                        <span class="font-mono text-(--gql-arg)">{{ field.name }}</span>
                        <span class="text-(--gql-text-secondary)">: </span>
                        <button
                            class="text-(--gql-type) hover:underline"
                            @click="navigateToType(field.type)"
                        >
                            {{ displayType(field.type) }}
                        </button>
                        <div
                            v-if="field.description"
                            class="mt-0.5 text-(--gql-text-secondary)"
                        >
                            {{ field.description }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Field documentation -->
            <div v-else-if="currentItem.def?._parentType">
                <h3 class="mb-1 text-sm font-semibold text-(--gql-text)">
                    <span class="font-normal text-(--gql-text-secondary)"
                        >{{ currentItem.def._parentType.name }}.</span
                    >{{ currentItem.def.name }}
                </h3>
                <div class="mb-2">
                    <span class="text-(--gql-text-secondary)">Type: </span>
                    <button
                        class="text-(--gql-type) hover:underline"
                        @click="navigateToType(currentItem.def.type)"
                    >
                        {{ displayType(currentItem.def.type) }}
                    </button>
                </div>
                <p
                    v-if="currentItem.def.description"
                    class="mb-3 leading-relaxed text-(--gql-text-secondary)"
                >
                    {{ currentItem.def.description }}
                </p>
                <div
                    v-if="currentItem.def.deprecationReason"
                    class="mb-3 text-orange-500"
                >
                    Deprecated: {{ currentItem.def.deprecationReason }}
                </div>

                <div v-if="fieldArgs.length > 0">
                    <h4 class="mb-1 font-medium text-(--gql-text)">Arguments</h4>
                    <div
                        v-for="arg in fieldArgs"
                        :key="arg.name"
                        class="border-l-2 border-(--gql-border) py-1.5 pl-2"
                    >
                        <span class="font-mono text-(--gql-arg)">{{ arg.name }}</span>
                        <span class="text-(--gql-text-secondary)">: </span>
                        <button
                            class="text-(--gql-type) hover:underline"
                            @click="navigateToType(arg.type)"
                        >
                            {{ displayType(arg.type) }}
                        </button>
                        <span
                            v-if="arg.defaultValue !== undefined"
                            class="text-(--gql-text-secondary)"
                        >
                            = {{ JSON.stringify(arg.defaultValue) }}</span
                        >
                        <div
                            v-if="arg.description"
                            class="mt-0.5 text-(--gql-text-secondary)"
                        >
                            {{ arg.description }}
                        </div>
                        <div
                            v-if="arg.deprecationReason"
                            class="mt-0.5 text-[10px] text-orange-500"
                        >
                            Deprecated: {{ arg.deprecationReason }}
                        </div>
                    </div>
                </div>
            </div>

            <!-- No schema -->
            <div
                v-else
                class="text-(--gql-text-secondary) italic"
            >
                No schema available. Click the refresh button to fetch the schema.
            </div>
        </div>
    </div>
</template>
