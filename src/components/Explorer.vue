<script setup lang="ts">
import type {
    DocumentNode,
    GraphQLField,
    SelectionSetNode,
    GraphQLObjectType,
    OperationDefinitionNode,
} from '~/src/utils';

import { inject, computed } from 'vue';

import { GRAPHIQL_STORE_KEY } from '~/src/types';
import { parse, print, Kind, getNamedType } from '~/src/utils';

import ExplorerField from '~/src/components/ExplorerField.vue';

const store = inject(GRAPHIQL_STORE_KEY)!;

// Parse the current query into AST
const documentAST = computed<DocumentNode | null>(() => {
    const query = store.activeTab.value?.query;
    if (!query?.trim()) return null;
    try {
        return parse(query);
    } catch {
        return null;
    }
});

// Extract definitions from AST
const definitions = computed(() => {
    if (!documentAST.value) return [];
    return documentAST.value.definitions.filter(
        (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION
    );
});

// If no definitions exist, provide a default empty query
const effectiveDefinitions = computed(() => {
    if (definitions.value.length > 0) return definitions.value;
    // Return a virtual empty query definition
    return [
        {
            kind: Kind.OPERATION_DEFINITION,
            operation: 'query' as const,
            name: { kind: Kind.NAME, value: 'MyQuery' } as any,
            variableDefinitions: [],
            directives: [],
            selectionSet: {
                kind: Kind.SELECTION_SET,
                selections: [],
            } as SelectionSetNode,
        },
    ] as OperationDefinitionNode[];
});

const schema = computed(() => store.schema.value);

function getRootTypeForOperation(
    op: OperationDefinitionNode
): GraphQLObjectType | null | undefined {
    if (!schema.value) return null;
    switch (op.operation) {
        case 'query':
            return schema.value.getQueryType();
        case 'mutation':
            return schema.value.getMutationType();
        case 'subscription':
            return schema.value.getSubscriptionType();
    }
    return null;
}

function getSortedFields(type: GraphQLObjectType): GraphQLField<any, any>[] {
    const fields = type.getFields();

    return Object.values(fields)
        .filter((field) => {
            // Filter out self-referential fields (e.g. query: Query on the Query type)
            // that would cause infinite nesting in the explorer tree
            const namedReturnType = getNamedType(field.type);

            return namedReturnType !== type;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
}

// When selections change in a definition, rebuild the document and update the editor
function onSelectionsChange(defIndex: number, newSelections: readonly any[]) {
    const currentQuery = store.activeTab.value?.query ?? '';
    let doc: DocumentNode;

    try {
        doc = currentQuery.trim()
            ? parse(currentQuery)
            : {
                  kind: Kind.DOCUMENT,
                  definitions: [],
              };
    } catch {
        doc = { kind: Kind.DOCUMENT, definitions: [] };
    }

    const defs = [...doc.definitions];
    const opDefs = defs.filter(
        (d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION
    );

    if (defIndex < opDefs.length) {
        // Update existing definition
        const target = opDefs[defIndex];
        const updated = {
            ...target,
            selectionSet: {
                ...target.selectionSet,
                selections: newSelections,
            },
        };
        const globalIdx = defs.indexOf(target);
        if (globalIdx >= 0) {
            defs[globalIdx] = updated;
        }
    } else {
        // We're working with the virtual definition - create a new one
        const virtualDef = effectiveDefinitions.value[defIndex];
        if (virtualDef) {
            defs.push({
                ...virtualDef,
                selectionSet: {
                    kind: Kind.SELECTION_SET,
                    selections: newSelections,
                } as SelectionSetNode,
            } as OperationDefinitionNode);
        }
    }

    const newDoc: DocumentNode = { ...doc, definitions: defs };
    const printed = print(newDoc);
    store.setEditorValue('query', printed);
}

// Add a new operation
function addOperation(opType: 'query' | 'mutation' | 'subscription') {
    const currentQuery = store.activeTab.value?.query ?? '';
    let doc: DocumentNode;
    try {
        doc = currentQuery.trim()
            ? parse(currentQuery)
            : { kind: Kind.DOCUMENT, definitions: [] };
    } catch {
        doc = { kind: Kind.DOCUMENT, definitions: [] };
    }

    const existingNames = doc.definitions
        .filter((d): d is OperationDefinitionNode => d.kind === Kind.OPERATION_DEFINITION)
        .map((d) => d.name?.value)
        .filter(Boolean);

    let name = `My${opType.charAt(0).toUpperCase() + opType.slice(1)}`;
    let counter = 1;
    while (existingNames.includes(name)) {
        name = `My${opType.charAt(0).toUpperCase() + opType.slice(1)}${++counter}`;
    }

    const newOp: OperationDefinitionNode = {
        kind: Kind.OPERATION_DEFINITION,
        operation: opType,
        name: { kind: Kind.NAME, value: name },
        variableDefinitions: [],
        directives: [],
        selectionSet: {
            kind: Kind.SELECTION_SET,
            selections: [
                {
                    kind: Kind.FIELD,
                    name: { kind: Kind.NAME, value: '__typename' },
                    arguments: [],
                },
            ],
        },
    } as any;

    const newDoc: DocumentNode = {
        ...doc,
        definitions: [...doc.definitions, newOp],
    };
    store.setEditorValue('query', print(newDoc));
}

// Check which operation types are available
const hasQuery = computed(() => !!schema.value?.getQueryType());
const hasMutation = computed(() => !!schema.value?.getMutationType());
const hasSubscription = computed(() => !!schema.value?.getSubscriptionType());
</script>

<template>
    <div class="flex h-full flex-col">
        <div
            v-if="!schema"
            class="px-3 py-4 text-center text-(--gql-text-secondary) italic"
        >
            No schema available. Click the refresh button in the sidebar to fetch the
            schema.
        </div>
        <div
            v-else
            class="flex-1 overflow-auto px-1 py-1"
        >
            <!-- Operation roots -->
            <div
                v-for="(def, defIndex) in effectiveDefinitions"
                :key="defIndex"
                class="mb-2"
            >
                <!-- Operation header -->
                <div class="flex items-center gap-1 px-2 py-1">
                    <span class="font-medium text-(--gql-keyword)">{{
                        def.operation
                    }}</span>
                    <span
                        v-if="def.name"
                        class="text-(--gql-def)"
                        >{{ def.name.value }}</span
                    >
                </div>

                <!-- Fields -->
                <div
                    v-if="getRootTypeForOperation(def)"
                    class="pl-2"
                >
                    <ExplorerField
                        v-for="field in getSortedFields(getRootTypeForOperation(def)!)"
                        :key="field.name"
                        :field="field"
                        :schema="schema!"
                        :selections="def.selectionSet?.selections ?? []"
                        :depth="0"
                        @update:selections="
                            (newSels) => onSelectionsChange(defIndex, newSels)
                        "
                    />
                </div>
            </div>

            <!-- Add operation buttons -->
            <div
                class="border-(--gql-border)] mt-2 flex items-center gap-1 border-t px-2 py-2"
            >
                <button
                    v-if="hasQuery"
                    class="rounded border border-(--gql-border) px-2 py-0.5 text-[10px] text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
                    @click="addOperation('query')"
                >
                    + Query
                </button>
                <button
                    v-if="hasMutation"
                    class="rounded border border-(--gql-border) px-2 py-0.5 text-[10px] text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
                    @click="addOperation('mutation')"
                >
                    + Mutation
                </button>
                <button
                    v-if="hasSubscription"
                    class="rounded border border-(--gql-border) px-2 py-0.5 text-[10px] text-(--gql-text-secondary) transition-colors hover:bg-(--gql-hover) hover:text-(--gql-text)"
                    @click="addOperation('subscription')"
                >
                    + Subscription
                </button>
            </div>
        </div>
    </div>
</template>
