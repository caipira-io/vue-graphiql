const pluginTailwindcss = require('prettier-plugin-tailwindcss');
const pluginSortImports = require('@caipira/prettier-plugin-sort-imports');

async function parseWithTailwindTypescript(...args) {
    const tsParser = pluginTailwindcss.parsers.typescript;

    if (tsParser && typeof tsParser.parse === 'function') {
        return tsParser.parse(...args);
    }

    if (typeof tsParser === 'function') {
        try {
            const maybeParser = await tsParser();
            if (maybeParser && typeof maybeParser.parse === 'function') {
                return maybeParser.parse(...args);
            }
        } catch (_err) {}

        return tsParser(...args);
    }
}

/** @type {import("prettier").Parser}  */
const myParser = {
    ...pluginSortImports.parsers.typescript,
    parse: parseWithTailwindTypescript,
};

/** @type {import("prettier").Plugin}  */
const plugin = {
    options: pluginSortImports.options,
    parsers: {
        typescript: myParser,
    },
};

module.exports = {
    plugins: [plugin],

    // Your prettier options
    arrowParens: 'always',
    bracketSpacing: true,
    printWidth: 90,
    semi: true,
    tabWidth: 4,
    singleQuote: true,
    useTabs: false,
    trailingComma: 'es5',
    vueIndentScriptAndStyle: false,
    singleAttributePerLine: true,

    // Options for @caipira/prettier-plugin-sort-imports
    sortingMethod: 'importLength',
    sortingOrder: 'ascending',
    importTypeOrder: ['importsType', 'NPMPackages', 'localImportsValue', 'components'],
    splitByImportTypeOrder: true,
    newlineBetweenTypes: true,
};
