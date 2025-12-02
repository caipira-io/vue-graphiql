# @caipira/vue-graphiql

The GraphiQL IDE for vuejs

![Showcase](https://github.com/caipira-io/vue-graphiql/raw/master/showcase.gif)

## Install

```sh
npm install vite-plugin-monaco-editor --save-dev
npm install @caipira/vue-graphiql
```

## Usage

Configure the monaco editor worker in your `vite.config` file:

```ts
import vue from '@vitejs/plugin-vue';
import { monacoViteConfig } from '@caipira/vue-graphiql';
import $monacoEditorPlugin from 'vite-plugin-monaco-editor';

const monacoEditorPlugin = $monacoEditorPlugin.default || $monacoEditorPlugin;

export default defineConfig({
    plugins: [vue(), monacoEditorPlugin(monacoViteConfig)],
});
```

Now you just need to import the component and the style file:

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

## License

MIT
