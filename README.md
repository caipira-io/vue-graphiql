# @caipira/vue-graphiql

The GraphiQL IDE for vuejs

![Showcase](https://github.com/caipira-io/vue-graphiql/raw/master/showcase.gif)

## Install

```sh
npm install @caipira/vue-graphiql
```

The editor runs on CodeMirror 6, provided through the `@caipira/tamandua`
`CodeEditor` host. So that the whole app shares a single CodeMirror instance
(CodeMirror relies on module-identity checks), those packages are **optional peer
dependencies** and must be installed by the consuming app:

```sh
npm install @caipira/tamandua \
  @codemirror/state @codemirror/view @codemirror/language \
  @codemirror/commands @codemirror/autocomplete @codemirror/lang-json \
  @codemirror/lint @lezer/common @lezer/highlight
```

`cm6-graphql` (schema-driven autocomplete/validation/hover) is bundled and needs
no extra install. No editor worker or bundler plugin is required - CodeMirror
needs none.

> If your app also imports `@codemirror/*` directly and pre-bundles deps with
> Vite, add `resolve.dedupe` + `optimizeDeps.include` for the CodeMirror core so
> only one copy of `@codemirror/state` etc. exists at runtime.

## Usage

Import the component and the style file:

```vue
<script lang="ts" setup>
import { GraphiQL } from '@caipira/vue-graphiql';

const theme = 'dark'; // light | dark, can be a computed prop, optional
const namespace = ''; // namespace local storage cache, optional
</script>

<template>
    <GraphiQL
        url="/graphql"
        :theme="theme"
        :namespace="namespace"
    />
</template>

<style>
@import '@caipira/vue-graphiql/style.css';
</style>
```

## Breaking change (Monaco -> CodeMirror)

This release replaces Monaco with CodeMirror 6. If you are upgrading:

- Remove `vite-plugin-monaco-editor`, `monaco-editor` and `monaco-graphql` from
  your app and drop the Monaco worker wiring from your `vite.config`.
- The `monacoViteConfig` export has been **removed**; delete the
  `monacoEditorPlugin(monacoViteConfig)` plugin from your Vite config.
- Install the CodeMirror optional peer dependencies listed under Install above.

## License

MIT
