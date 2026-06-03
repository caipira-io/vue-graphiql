import {
    parse,
    print,
    visit,
    getIntrospectionQuery,
    buildClientSchema,
    type DocumentNode,
    type OperationDefinitionNode,
    type GraphQLSchema,
    type GraphQLNamedType,
    type GraphQLField,
    type GraphQLArgument,
    type GraphQLInputType,
    type GraphQLOutputType,
    type GraphQLObjectType,
    type GraphQLEnumType,
    type GraphQLInputObjectType,
    type GraphQLScalarType,
    type SelectionSetNode,
    type FieldNode,
    type ArgumentNode,
    type ValueNode,
    Kind,
    isObjectType,
    isInterfaceType,
    isUnionType,
    isEnumType,
    isInputObjectType,
    isScalarType,
    isNonNullType,
    isListType,
    isLeafType,
    getNamedType,
} from 'graphql';
import type { StorageWrapper, TabState } from './types';

// ---- UUID ----
let _idCounter = 0;
export function generateId(): string {
    return `tab-${Date.now()}-${++_idCounter}`;
}

// ---- Debounce ----
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
    let timeout: ReturnType<typeof setTimeout> | null = null;
    return ((...args: any[]) => {
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
            timeout = null;
            fn(...args);
        }, ms);
    }) as any;
}

// ---- Tab helpers ----
const OP_NAME_RE = /^(?!#).*(query|subscription|mutation)\s+([a-zA-Z0-9_]+)/m;

export function fuzzyExtractOperationName(query: string): string {
    const match = query.match(OP_NAME_RE);
    return match ? match[2] : '<untitled>';
}

export function hashTabContents(query: string, variables: string, headers: string): string {
    return [query ?? '', variables ?? '', headers ?? ''].join('|');
}

export function createTab(overrides: Partial<TabState> = {}): TabState {
    const query = overrides.query ?? '';
    const variables = overrides.variables ?? '';
    const headers = overrides.headers ?? '';
    return {
        id: generateId(),
        hash: hashTabContents(query, variables, headers),
        title: query ? fuzzyExtractOperationName(query) : '<untitled>',
        query,
        variables,
        headers,
        operationName: overrides.operationName ?? null,
        response: overrides.response ?? '',
    };
}

export function serializeTabState(
    tabs: TabState[],
    activeTabIndex: number,
    shouldPersistHeaders: boolean,
): string {
    return JSON.stringify({
        activeTabIndex,
        tabs: tabs.map((t) => ({
            query: t.query,
            variables: t.variables,
            headers: shouldPersistHeaders ? t.headers : null,
            operationName: t.operationName,
            title: t.title,
            id: t.id,
        })),
    });
}

export function deserializeTabState(json: string): { tabs: TabState[]; activeTabIndex: number } | null {
    try {
        const data = JSON.parse(json);
        if (!data || !Array.isArray(data.tabs)) return null;
        return {
            activeTabIndex: typeof data.activeTabIndex === 'number' ? data.activeTabIndex : 0,
            tabs: data.tabs.map((t: any) => createTab({
                query: t.query ?? '',
                variables: t.variables ?? '',
                headers: t.headers ?? '',
                operationName: t.operationName ?? null,
            })),
        };
    } catch {
        return null;
    }
}

// ---- Storage wrapper ----
export function createStorage(namespace: string): StorageWrapper {
    const prefix = namespace ? `${namespace}:` : 'graphiql:';
    return {
        get(key: string): string | null {
            try {
                const val = localStorage.getItem(`${prefix}${key}`);
                if (val === 'null' || val === 'undefined') {
                    localStorage.removeItem(`${prefix}${key}`);
                    return null;
                }
                return val;
            } catch {
                return null;
            }
        },
        set(key: string, value: string): void {
            try {
                if (!value) {
                    localStorage.removeItem(`${prefix}${key}`);
                } else {
                    localStorage.setItem(`${prefix}${key}`, value);
                }
            } catch {
                // quota exceeded or disabled - ignore
            }
        },
        remove(key: string): void {
            try {
                localStorage.removeItem(`${prefix}${key}`);
            } catch {
                // ignore
            }
        },
    };
}

// ---- Operation facts ----
export function getOperationFacts(queryStr: string): {
    documentAST: DocumentNode;
    operations: OperationDefinitionNode[];
} | null {
    if (!queryStr) return null;
    try {
        const documentAST = parse(queryStr);
        const operations: OperationDefinitionNode[] = [];
        visit(documentAST, {
            OperationDefinition(node) {
                operations.push(node);
            },
        });
        return { documentAST, operations };
    } catch {
        return null;
    }
}

export function getSelectedOperationName(
    prevOperations: OperationDefinitionNode[] | undefined,
    prevName: string | null | undefined,
    operations: OperationDefinitionNode[] | undefined,
): string | null {
    if (!operations || operations.length === 0) return null;
    const names = operations.map((o) => o.name?.value ?? null);
    if (prevName && names.includes(prevName)) return prevName;
    if (prevOperations && prevName) {
        const prevIdx = prevOperations.findIndex((o) => o.name?.value === prevName);
        if (prevIdx >= 0 && prevIdx < names.length) return names[prevIdx];
    }
    return names[0] ?? null;
}

// ---- JSON with comments parsing ----
export function parseJsonc(text: string): any {
    if (!text || !text.trim()) return undefined;
    // Strip single-line comments and trailing commas
    const cleaned = text
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(cleaned);
}

// ---- Format helpers ----
export function formatResult(result: any): string {
    return JSON.stringify(result, null, 2);
}

export function formatError(error: unknown): string {
    if (Array.isArray(error)) {
        return JSON.stringify(
            { errors: error.map(formatSingleError) },
            null,
            2,
        );
    }
    return JSON.stringify({ errors: [formatSingleError(error)] }, null, 2);
}

function formatSingleError(error: unknown): any {
    if (error instanceof Error) {
        return { message: error.message, stack: error.stack };
    }
    return error;
}

// ---- Schema helpers ----
export function getTypeName(type: GraphQLOutputType | GraphQLInputType): string {
    if (isNonNullType(type)) return `${getTypeName(type.ofType as GraphQLOutputType)}!`;
    if (isListType(type)) return `[${getTypeName(type.ofType as GraphQLOutputType)}]`;
    return (type as GraphQLNamedType).name;
}

export function unwrapType(type: GraphQLOutputType | GraphQLInputType): GraphQLNamedType {
    return getNamedType(type)!;
}

export function isObjectLikeType(type: GraphQLNamedType): boolean {
    return isObjectType(type) || isInterfaceType(type) || isUnionType(type);
}

export function getFields(type: GraphQLNamedType): Record<string, GraphQLField<any, any>> | null {
    if (isObjectType(type) || isInterfaceType(type)) {
        return type.getFields();
    }
    return null;
}

// ---- Explorer AST helpers ----
export function findFieldSelection(
    selections: ReadonlyArray<any> | undefined,
    fieldName: string,
): FieldNode | null {
    if (!selections) return null;
    for (const sel of selections) {
        if (sel.kind === Kind.FIELD && sel.name.value === fieldName) {
            return sel;
        }
    }
    return null;
}

export function toggleFieldInSelections(
    selections: ReadonlyArray<any>,
    fieldName: string,
    fieldType: GraphQLOutputType,
    schema: GraphQLSchema,
): any[] {
    const existing = findFieldSelection(selections, fieldName);
    if (existing) {
        return selections.filter((s: any) => s !== existing);
    }
    return [...selections, createFieldNode(fieldName, fieldType, schema)];
}

function createFieldNode(
    fieldName: string,
    fieldType: GraphQLOutputType,
    schema: GraphQLSchema,
): FieldNode {
    const namedType = unwrapType(fieldType);
    const hasSubFields = isObjectLikeType(namedType);

    const field: any = {
        kind: Kind.FIELD,
        name: { kind: Kind.NAME, value: fieldName },
        arguments: [],
    };

    if (hasSubFields) {
        const defaultFields = getDefaultFieldNames(namedType, schema);
        field.selectionSet = {
            kind: Kind.SELECTION_SET,
            selections: defaultFields.map((name: string) => ({
                kind: Kind.FIELD,
                name: { kind: Kind.NAME, value: name },
                arguments: [],
            })),
        };
    }

    return field;
}

function getDefaultFieldNames(type: GraphQLNamedType, _schema: GraphQLSchema): string[] {
    const fields = getFields(type);
    if (!fields) return ['__typename'];

    const fieldNames = Object.keys(fields);
    // Prefer id, then edges, then node
    if (fieldNames.includes('id')) return ['id'];
    if (fieldNames.includes('edges')) return ['edges'];
    if (fieldNames.includes('node')) return ['node'];
    // Fall back to first 2 leaf fields
    const leafFields = fieldNames.filter((n) => isLeafType(unwrapType(fields[n].type)));
    return leafFields.length > 0 ? leafFields.slice(0, 2) : ['__typename'];
}

export function addArgumentToField(
    fieldNode: FieldNode,
    arg: GraphQLArgument,
): FieldNode {
    const existingArgs = fieldNode.arguments ? [...fieldNode.arguments] : [];
    existingArgs.push(createArgumentNode(arg));
    return { ...fieldNode, arguments: existingArgs };
}

export function removeArgumentFromField(
    fieldNode: FieldNode,
    argName: string,
): FieldNode {
    const args = (fieldNode.arguments ?? []).filter(
        (a) => a.name.value !== argName,
    );
    return { ...fieldNode, arguments: args };
}

export function updateArgumentValue(
    fieldNode: FieldNode,
    argName: string,
    value: ValueNode,
): FieldNode {
    const args = (fieldNode.arguments ?? []).map((a) =>
        a.name.value === argName ? { ...a, value } : a,
    );
    return { ...fieldNode, arguments: args };
}

function createArgumentNode(arg: GraphQLArgument): ArgumentNode {
    return {
        kind: Kind.ARGUMENT,
        name: { kind: Kind.NAME, value: arg.name },
        value: getDefaultValueForType(arg.type),
    };
}

export function getDefaultValueForType(type: GraphQLInputType): ValueNode {
    const namedType = unwrapType(type) as GraphQLNamedType;

    if (isEnumType(namedType)) {
        const values = namedType.getValues();
        return { kind: Kind.ENUM, value: values[0]?.value ?? '' };
    }

    if (isInputObjectType(namedType)) {
        const fields = namedType.getFields();
        const requiredFields = Object.values(fields).filter((f) => isNonNullType(f.type));
        return {
            kind: Kind.OBJECT,
            fields: requiredFields.map((f) => ({
                kind: Kind.OBJECT_FIELD,
                name: { kind: Kind.NAME, value: f.name },
                value: getDefaultValueForType(f.type),
            })),
        };
    }

    if (isScalarType(namedType)) {
        switch (namedType.name) {
            case 'Boolean':
                return { kind: Kind.BOOLEAN, value: false };
            case 'Int':
                return { kind: Kind.INT, value: '0' };
            case 'Float':
                return { kind: Kind.FLOAT, value: '0.0' };
            default:
                return { kind: Kind.STRING, value: '' };
        }
    }

    return { kind: Kind.STRING, value: '' };
}

export function coerceArgValue(type: GraphQLInputType, value: string): ValueNode {
    const namedType = unwrapType(type) as GraphQLNamedType;

    if (isEnumType(namedType)) {
        return { kind: Kind.ENUM, value };
    }

    if (isScalarType(namedType)) {
        switch (namedType.name) {
            case 'Boolean':
                return { kind: Kind.BOOLEAN, value: value === 'true' };
            case 'Int': {
                const parsed = parseInt(value, 10);
                return { kind: Kind.INT, value: String(isNaN(parsed) ? 0 : parsed) };
            }
            case 'Float': {
                const parsed = parseFloat(value);
                return { kind: Kind.FLOAT, value: String(isNaN(parsed) ? 0 : parsed) };
            }
            default:
                return { kind: Kind.STRING, value };
        }
    }

    return { kind: Kind.STRING, value };
}

export function printArgValue(value: ValueNode): string {
    switch (value.kind) {
        case Kind.STRING:
            return value.value;
        case Kind.INT:
        case Kind.FLOAT:
            return value.value;
        case Kind.BOOLEAN:
            return String(value.value);
        case Kind.ENUM:
            return value.value;
        case Kind.NULL:
            return 'null';
        case Kind.VARIABLE:
            return `$${value.name.value}`;
        default:
            return print({ kind: Kind.DOCUMENT, definitions: [] } as any); // fallback
    }
}

// ---- Introspection ----
export async function introspectSchema(
    fetcher: any,
): Promise<GraphQLSchema> {
    const introspectionQuery = getIntrospectionQuery({
        inputValueDeprecation: true,
        schemaDescription: true,
    });

    const result = await fetchResult(fetcher, introspectionQuery, 'IntrospectionQuery');

    if (!result || !result.data) {
        // Retry without subscriptionType (some servers don't support it)
        const fallbackQuery = getIntrospectionQuery({
            inputValueDeprecation: true,
            schemaDescription: true,
        });
        const fallbackResult = await fetchResult(fetcher, fallbackQuery, 'IntrospectionQuery');
        if (!fallbackResult?.data) {
            throw new Error('Failed to fetch schema via introspection');
        }
        return buildClientSchema(fallbackResult.data as any);
    }

    return buildClientSchema(result.data as any);
}

async function fetchResult(fetcher: any, query: string, operationName: string): Promise<any> {
    const result = fetcher({ query, operationName }, {});

    if (result && typeof result.then === 'function') {
        return await result;
    }
    if (result && typeof result[Symbol.asyncIterator] === 'function') {
        const iter = result[Symbol.asyncIterator]();
        const { value } = await iter.next();
        await iter.return?.();
        return value;
    }
    if (result && typeof result.subscribe === 'function') {
        return new Promise((resolve, reject) => {
            const sub = result.subscribe({
                next: (val: any) => { sub.unsubscribe(); resolve(val); },
                error: reject,
                complete: () => resolve(null),
            });
        });
    }
    return result;
}

// ---- Markdown ----
let _md: any = null;
export async function renderMarkdown(text: string): Promise<string> {
    if (!_md) {
        const MarkdownIt = (await import('markdown-it')).default;
        _md = new MarkdownIt({ html: false, linkify: true });
    }
    return _md.render(text);
}

// Re-export graphql utilities that components need
export {
    parse,
    print,
    visit,
    Kind,
    isObjectType,
    isInterfaceType,
    isUnionType,
    isEnumType,
    isInputObjectType,
    isScalarType,
    isNonNullType,
    isListType,
    isLeafType,
    getNamedType,
};

export type {
    DocumentNode,
    OperationDefinitionNode,
    GraphQLSchema,
    GraphQLNamedType,
    GraphQLField,
    GraphQLArgument,
    GraphQLInputType,
    GraphQLOutputType,
    GraphQLObjectType,
    GraphQLEnumType,
    GraphQLInputObjectType,
    GraphQLScalarType,
    SelectionSetNode,
    FieldNode,
    ArgumentNode,
    ValueNode,
};
