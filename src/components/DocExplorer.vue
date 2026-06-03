<script setup lang="ts">
import { inject, ref, computed, defineComponent, h, type PropType } from 'vue';
import { GRAPHIQL_STORE_KEY, type DocExplorerNavItem } from '../types';
import {
    isObjectType,
    isInterfaceType,
    isUnionType,
    isEnumType,
    isInputObjectType,
    isScalarType,
    getNamedType,
    getTypeName,
    type GraphQLSchema,
    type GraphQLNamedType,
    type GraphQLField,
    type GraphQLInputType,
    type GraphQLOutputType,
} from '../utils';

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
        .filter(name => !name.startsWith('__') && name.toLowerCase().includes(query))
        .sort()
        .slice(0, 20)
        .map(name => typeMap[name]);
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
    return types.filter(t => t.type);
});

const allSchemaTypes = computed(() => {
    if (!schema.value) return [];
    const typeMap = schema.value.getTypeMap();
    return Object.keys(typeMap)
        .filter(name => !name.startsWith('__'))
        .sort()
        .map(name => typeMap[name]);
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
    <div class="flex flex-col h-full">
        <!-- Header / Breadcrumb -->
        <div v-if="navStack.length > 1" class="flex items-center gap-1 px-3 py-2 border-b border-[var(--gql-border)]">
            <button
                class="text-xs text-[var(--gql-primary)] hover:underline"
                @click="pop()"
            >
                &larr; {{ navStack[navStack.length - 2].name }}
            </button>
        </div>

        <!-- Search (only on root) -->
        <div v-if="navStack.length === 1" class="px-3 py-2 border-b border-[var(--gql-border)]">
            <input
                v-model="searchQuery"
                type="text"
                placeholder="Search types..."
                class="w-full px-2 py-1 text-xs rounded border border-[var(--gql-border)] bg-[var(--gql-bg)] text-[var(--gql-text)] placeholder:text-[var(--gql-text-secondary)] focus:outline-none focus:border-[var(--gql-primary)]"
            />
        </div>

        <!-- Content -->
        <div class="flex-1 overflow-auto px-3 py-2 text-xs">
            <!-- Search results -->
            <div v-if="searchQuery && navStack.length === 1">
                <div v-if="searchResults.length === 0" class="text-[var(--gql-text-secondary)] italic">
                    No types found
                </div>
                <div v-for="type in searchResults" :key="type.name" class="py-0.5">
                    <button
                        class="text-[var(--gql-type)] hover:underline"
                        @click="navigateToType(type as any)"
                    >{{ type.name }}</button>
                </div>
            </div>

            <!-- Schema root view -->
            <div v-else-if="!currentItem.def && schema">
                <div v-if="schema.description" class="mb-3">
                    <p class="text-[var(--gql-text-secondary)] mb-2">{{ schema.description }}</p>
                </div>
                <div class="mb-3">
                    <h3 class="font-semibold text-[var(--gql-text)] mb-1">Root Types</h3>
                    <div v-for="rt in rootTypes" :key="rt.label" class="py-0.5">
                        <span class="text-[var(--gql-text-secondary)]">{{ rt.label }}: </span>
                        <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(rt.type as any)">
                            {{ (rt.type as any).name }}
                        </button>
                    </div>
                </div>
                <div>
                    <h3 class="font-semibold text-[var(--gql-text)] mb-1">All Types</h3>
                    <div v-for="type in allSchemaTypes" :key="type.name" class="py-0.5">
                        <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(type as any)">
                            {{ type.name }}
                        </button>
                    </div>
                </div>
            </div>

            <!-- Type documentation -->
            <div v-else-if="currentItem.def && !currentItem.def._parentType">
                <h3 class="font-semibold text-[var(--gql-text)] text-sm mb-1">{{ currentItem.def.name }}</h3>
                <p v-if="currentItem.def.description" class="text-[var(--gql-text-secondary)] mb-3 leading-relaxed">{{ currentItem.def.description }}</p>

                <div v-if="isScalar" class="text-[var(--gql-text-secondary)] italic">Scalar type</div>

                <div v-if="isEnum && typeEnumValues.length" class="mb-3">
                    <h4 class="font-medium text-[var(--gql-text)] mb-1">Values</h4>
                    <div v-for="v in typeEnumValues" :key="v.value" class="py-1 pl-2 border-l-2 border-[var(--gql-border)]">
                        <div class="text-[var(--gql-enum)] font-mono">{{ v.value }}</div>
                        <div v-if="v.description" class="text-[var(--gql-text-secondary)] mt-0.5">{{ v.description }}</div>
                        <div v-if="v.deprecationReason" class="text-orange-500 text-[10px] mt-0.5">Deprecated: {{ v.deprecationReason }}</div>
                    </div>
                </div>

                <div v-if="typeInterfaces.length > 0" class="mb-3">
                    <h4 class="font-medium text-[var(--gql-text)] mb-1">Implements</h4>
                    <span v-for="(iface, i) in typeInterfaces" :key="iface.name">
                        <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(iface as any)">{{ iface.name }}</button>
                        <span v-if="i < typeInterfaces.length - 1" class="text-[var(--gql-text-secondary)]">, </span>
                    </span>
                </div>

                <div v-if="typePossibleTypes.length > 0" class="mb-3">
                    <h4 class="font-medium text-[var(--gql-text)] mb-1">Possible Types</h4>
                    <div v-for="pt in typePossibleTypes" :key="pt.name" class="py-0.5">
                        <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(pt as any)">{{ pt.name }}</button>
                    </div>
                </div>

                <div v-if="typeFields.length > 0" class="mb-3">
                    <h4 class="font-medium text-[var(--gql-text)] mb-1">Fields</h4>
                    <div v-for="field in typeFields" :key="field.name" class="py-1.5 pl-2 border-l-2 border-[var(--gql-border)]">
                        <div>
                            <button class="text-[var(--gql-field)] hover:underline font-mono" @click="navigateToField(field, currentItem.def)">{{ field.name }}</button>
                            <span v-if="field.args?.length > 0" class="text-[var(--gql-text-secondary)]">(<!--
                                --><span v-for="(arg, i) in field.args" :key="arg.name"><!--
                                    --><span class="text-[var(--gql-arg)]">{{ arg.name }}</span>: <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(arg.type)">{{ displayType(arg.type) }}</button><span v-if="i < field.args.length - 1">, </span><!--
                                --></span><!--
                            -->)</span>
                            <span class="text-[var(--gql-text-secondary)]">: </span>
                            <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(field.type)">{{ displayType(field.type) }}</button>
                        </div>
                        <div v-if="field.description" class="text-[var(--gql-text-secondary)] mt-0.5">{{ field.description }}</div>
                        <div v-if="field.deprecationReason" class="text-orange-500 text-[10px] mt-0.5">Deprecated: {{ field.deprecationReason }}</div>
                    </div>
                </div>

                <div v-if="typeInputFields.length > 0" class="mb-3">
                    <h4 class="font-medium text-[var(--gql-text)] mb-1">Input Fields</h4>
                    <div v-for="field in typeInputFields" :key="field.name" class="py-1.5 pl-2 border-l-2 border-[var(--gql-border)]">
                        <span class="text-[var(--gql-arg)] font-mono">{{ field.name }}</span>
                        <span class="text-[var(--gql-text-secondary)]">: </span>
                        <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(field.type)">{{ displayType(field.type) }}</button>
                        <div v-if="field.description" class="text-[var(--gql-text-secondary)] mt-0.5">{{ field.description }}</div>
                    </div>
                </div>
            </div>

            <!-- Field documentation -->
            <div v-else-if="currentItem.def?._parentType">
                <h3 class="font-semibold text-[var(--gql-text)] text-sm mb-1">
                    <span class="text-[var(--gql-text-secondary)] font-normal">{{ currentItem.def._parentType.name }}.</span>{{ currentItem.def.name }}
                </h3>
                <div class="mb-2">
                    <span class="text-[var(--gql-text-secondary)]">Type: </span>
                    <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(currentItem.def.type)">{{ displayType(currentItem.def.type) }}</button>
                </div>
                <p v-if="currentItem.def.description" class="text-[var(--gql-text-secondary)] mb-3 leading-relaxed">{{ currentItem.def.description }}</p>
                <div v-if="currentItem.def.deprecationReason" class="text-orange-500 text-xs mb-3">Deprecated: {{ currentItem.def.deprecationReason }}</div>

                <div v-if="fieldArgs.length > 0">
                    <h4 class="font-medium text-[var(--gql-text)] mb-1">Arguments</h4>
                    <div v-for="arg in fieldArgs" :key="arg.name" class="py-1.5 pl-2 border-l-2 border-[var(--gql-border)]">
                        <span class="text-[var(--gql-arg)] font-mono">{{ arg.name }}</span>
                        <span class="text-[var(--gql-text-secondary)]">: </span>
                        <button class="text-[var(--gql-type)] hover:underline" @click="navigateToType(arg.type)">{{ displayType(arg.type) }}</button>
                        <span v-if="arg.defaultValue !== undefined" class="text-[var(--gql-text-secondary)]"> = {{ JSON.stringify(arg.defaultValue) }}</span>
                        <div v-if="arg.description" class="text-[var(--gql-text-secondary)] mt-0.5">{{ arg.description }}</div>
                        <div v-if="arg.deprecationReason" class="text-orange-500 text-[10px] mt-0.5">Deprecated: {{ arg.deprecationReason }}</div>
                    </div>
                </div>
            </div>

            <!-- No schema -->
            <div v-else class="text-[var(--gql-text-secondary)] italic">
                No schema available. Click the refresh button to fetch the schema.
            </div>
        </div>
    </div>
</template>
