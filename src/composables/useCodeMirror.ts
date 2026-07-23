import type { Extension } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import type { GraphQLSchema } from 'graphql';

import { tags } from '@lezer/highlight';
import { Prec } from '@codemirror/state';
import { linter } from '@codemirror/lint';
import { keymap, lineNumbers } from '@codemirror/view';
import { graphql, updateSchema } from 'cm6-graphql';
import { json, jsonParseLinter } from '@codemirror/lang-json';
import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';

/**
 * Theme-aware syntax highlighting. Every colour is a vue-graphiql --gql-* CSS
 * variable (defined per light/dark in assets/styles/style.css), so tokens
 * recolour with the container's .dark class - no editor rebuild needed. The map
 * covers both the cm6-graphql language tags and the @codemirror/lang-json tags,
 * so a single style serves every pane.
 */
const highlightStyle = HighlightStyle.define([
    {
        tag: [tags.keyword, tags.definitionKeyword, tags.bool, tags.null],
        color: 'var(--gql-keyword)',
    },
    { tag: tags.propertyName, color: 'var(--gql-field)' },
    { tag: [tags.attributeName, tags.variableName], color: 'var(--gql-arg)' },
    { tag: tags.string, color: 'var(--gql-string)' },
    { tag: [tags.integer, tags.float, tags.number], color: 'var(--gql-number)' },
    { tag: tags.special(tags.name), color: 'var(--gql-enum)' },
    { tag: tags.modifier, color: 'var(--gql-def)' },
    { tag: [tags.atom, tags.typeName], color: 'var(--gql-type)' },
    {
        tag: [tags.comment, tags.lineComment],
        color: 'var(--gql-text-secondary)',
        fontStyle: 'italic',
    },
]);

const highlighting = syntaxHighlighting(highlightStyle);

/**
 * CodeMirror wiring for vue-graphiql's four editor panes. This replaces the
 * former Monaco singleton (useMonaco): there is no global editor runtime to
 * boot, so this is just a factory of pane-specific extension stacks plus the
 * schema-update bridge for the query editor. The tamandua CodeEditor host owns
 * the actual EditorView; these extensions are injected through its `extensions`
 * prop, and @codemirror/* resolves to the consuming app's single copy.
 */
export function useCodeMirror() {
    /**
     * Query-pane stack. cm6-graphql only registers a completion SOURCE and a
     * linter on the graphql-language-service backend; the app must supply the
     * autocompletion() UI itself (the host does not bundle it). completionKeymap
     * is wrapped in Prec.highest so Enter/Tab/arrows drive the completion popup
     * ahead of the host's base keymap (which is otherwise higher precedence and
     * would insert a newline instead of accepting). The schema is optional and
     * patched in live via updateQuerySchema, so this stack is built once.
     *
     * Schema-driven validation shows as lint underlines; field/type docs surface
     * in the completion info panel. cm6-graphql ships no mouse-hover tooltip.
     */
    function graphqlExtensions(
        schema: GraphQLSchema | null,
        extraKeymap: Extension
    ): Extension[] {
        return [
            lineNumbers(),
            highlighting,
            autocompletion(),
            ...graphql(schema ?? undefined),
            Prec.highest(keymap.of(completionKeymap)),
            /* Prec.highest so Mod-Enter (run) beats the host's base defaultKeymap,
               which binds Mod-Enter to insertBlankLine and would otherwise win. */
            Prec.highest(extraKeymap),
        ];
    }

    /**
     * JSON-pane stack for variables/headers (editable, linted, line-numbered)
     * and the response (read-only: pass no options).
     */
    function jsonExtensions(
        opts: {
            lineNumbers?: boolean;
            lint?: boolean;
            extraKeymap?: Extension;
        } = {}
    ): Extension[] {
        const ext: Extension[] = [highlighting, json()];
        if (opts.lineNumbers) ext.unshift(lineNumbers());
        if (opts.lint) ext.push(linter(jsonParseLinter()));
        /* Prec.highest so Mod-Enter (run) beats the host's base defaultKeymap
           (which binds Mod-Enter to insertBlankLine). */
        if (opts.extraKeymap) ext.push(Prec.highest(opts.extraKeymap));
        return ext;
    }

    /**
     * Push a new schema into the live query editor. cm6-graphql binds the schema
     * through a state field on the view (not Monaco model URIs), so this must run
     * against the host's exposed EditorView whenever store.schema changes.
     */
    function updateQuerySchema(
        view: EditorView | undefined,
        schema: GraphQLSchema | null
    ): void {
        if (view && schema) updateSchema(view, schema);
    }

    return { graphqlExtensions, jsonExtensions, updateQuerySchema };
}
