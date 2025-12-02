<script lang="ts" setup>
    import type { Root } from 'react-dom/client';

    import React from 'react';
    import ReactDOM from 'react-dom/client';
    import { GraphiQL } from 'graphiql';
    import { explorerPlugin } from '@graphiql/plugin-explorer';
    import { useGraphiQLActions } from '@graphiql/react';
    import { createGraphiQLFetcher } from '@graphiql/toolkit';

    import { onMounted, onUnmounted, useTemplateRef, watch } from 'vue';

    const props = withDefaults(
        defineProps<{
            url: string;
            theme?: 'light' | 'dark';
            namespace?: string;
            initialQuery?: string;
            defaultQuery?: string;

            /**
             * Classes
             */

            explorerPluginClass?: string;
        }>(),
        {
            theme: 'light',
            namespace: '',
            initialQuery: undefined,
            defaultQuery: '# Happy hacking!',

            /**
             * Classes
             */

            explorerPluginClass: '',
        }
    );

    const ThemeBridge = ({ theme }: { theme: 'light' | 'dark' }) => {
        const { setTheme } = useGraphiQLActions();

        React.useEffect(() => {
            setTheme(theme);
        }, [theme, setTheme]);

        return null;
    };

    const explorer = explorerPlugin();
    const graphiqlContainer =
        useTemplateRef<HTMLDivElement>('graphiqlContainer');

    const storage: typeof localStorage = {
        ...localStorage,
        getItem(key) {
            return localStorage.getItem(`${props.namespace}:${key}`);
        },
        setItem(key, value) {
            return localStorage.setItem(`${props.namespace}:${key}`, value);
        },
        removeItem(key) {
            return localStorage.removeItem(`${props.namespace}:${key}`);
        },
    };

    let reactRoot: Root;

    const fetcher = createGraphiQLFetcher({
        url: props.url,
    });

    const renderGraphiQL = () => {
        reactRoot?.unmount();
        reactRoot = ReactDOM.createRoot(graphiqlContainer.value!);
        reactRoot.render(
            React.createElement(
                React.StrictMode,
                null,
                React.createElement(
                    GraphiQL,
                    {
                        fetcher,
                        storage,
                        defaultEditorToolsVisibility: true,
                        isHeadersEditorEnabled: false,
                        plugins: [explorer],
                        initialQuery: props.initialQuery,
                        defaultQuery: props.defaultQuery,
                        forcedTheme: props.theme,
                    },
                    React.createElement(GraphiQL.Logo, null, ''),
                    React.createElement(ThemeBridge, { theme: props.theme })
                )
            )
        );

        setTimeout(() => {
            const explorerWrapper = document.querySelector('.graphiql-plugin');

            if (explorerWrapper) {
                explorerWrapper.classList.add(props.explorerPluginClass);
            }
        }, 200);
    };

    onMounted(() => {
        renderGraphiQL();
    });

    onUnmounted(() => {
        reactRoot?.unmount();
    });

    watch(() => props.theme, renderGraphiQL);
</script>

<template>
    <div
        ref="graphiqlContainer"
        class="graphiql-container"
    />
</template>

<style>
    @import 'graphiql/style.css';
    @import '@graphiql/plugin-explorer/style.css';

    .graphiql-container {
        width: 100%;
        height: 100%;
    }

    .graphiql-container {
        --color-primary: var(--blue-h) var(--blue-s) var(--blue-l) !important;
        --color-base: var(--primary-h) var(--primary-s) var(--primary-l) !important;
    }

    button.graphiql-execute-button > svg {
        color: var(--caipira-primary) !important;
    }

    button.graphiql-execute-button:hover > svg {
        color: var(--caipira-primary-inverted) !important;
    }
</style>
