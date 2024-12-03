import _import from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";
import preferArrow from "eslint-plugin-prefer-arrow";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import modulesNewline from "eslint-plugin-modules-newline";
import { fixupPluginRules } from "@eslint/compat";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [...compat.extends(
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
), {
    plugins: {
        import: fixupPluginRules(_import),
        jsdoc,
        "prefer-arrow": preferArrow,
        "@typescript-eslint": typescriptEslint,
        "modules-newline": modulesNewline,
    },

    languageOptions: {
        parser: tsParser,
        ecmaVersion: 2019,
        sourceType: "module",

        parserOptions: {
            project: "tsconfig.json",
        },
    },

    rules: {
        "@typescript-eslint/adjacent-overload-signatures": ["error"],
        "@typescript-eslint/array-type": ["error"],

        // "@typescript-eslint/ban-types": ["error", {
        //     types: {
        //         Object: {
        //             message: "Avoid using the `Object` type. Did you mean `object`?",
        //         },

        //         Function: {
        //             message: "Avoid using the `Function` type. Prefer a specific function type, like `() => void`.",
        //         },

        //         Boolean: {
        //             message: "Avoid using the `Boolean` type. Did you mean `boolean`?",
        //         },

        //         Number: {
        //             message: "Avoid using the `Number` type. Did you mean `number`?",
        //         },

        //         String: {
        //             message: "Avoid using the `String` type. Did you mean `string`?",
        //         },

        //         Symbol: {
        //             message: "Avoid using the `Symbol` type. Did you mean `symbol`?",
        //         },
        //     },
        // }],

        "@/brace-style": ["error"],
        "@typescript-eslint/consistent-type-assertions": ["error"],
        "@typescript-eslint/dot-notation": ["error"],

        "@typescript-eslint/explicit-member-accessibility": ["error", {
            accessibility: "explicit",

            overrides: {
                accessors: "explicit",
                constructors: "explicit",
                parameterProperties: "explicit",
            },
        }],

        "@/func-call-spacing": ["error"],

        "@/indent": ["error", 2, {
            FunctionDeclaration: {
                parameters: "first",
            },

            FunctionExpression: {
                parameters: "first",
            },
        }],

        // "@typescript-eslint/member-delimiter-style": ["error", {
        //     multiline: {
        //         delimiter: "semi",
        //         requireLast: true,
        //     },

        //     singleline: {
        //         delimiter: "semi",
        //         requireLast: false,
        //     },
        // }],

        // "@typescript-eslint/member-ordering": ["error", {
        //     default: {
        //         memberTypes: [
        //             "signature",
        //             "public-static-field",
        //             "protected-static-field",
        //             "private-static-field",
        //             "public-decorated-field",
        //             "protected-decorated-field",
        //             "private-decorated-field",
        //             "public-instance-field",
        //             "protected-instance-field",
        //             "private-instance-field",
        //             "public-abstract-field",
        //             "protected-abstract-field",
        //             "private-abstract-field",
        //             "public-field",
        //             "protected-field",
        //             "private-field",
        //             "static-field",
        //             "instance-field",
        //             "abstract-field",
        //             "decorated-field",
        //             "field",
        //             "public-constructor",
        //             "protected-constructor",
        //             "private-constructor",
        //             "constructor",
        //             "public-static-method",
        //             "protected-static-method",
        //             "private-static-method",
        //             "public-decorated-method",
        //             "protected-decorated-method",
        //             "private-decorated-method",
        //             "public-instance-method",
        //             "protected-instance-method",
        //             "private-instance-method",
        //             "public-abstract-method",
        //             "protected-abstract-method",
        //             "private-abstract-method",
        //             "public-method",
        //             "protected-method",
        //             "private-method",
        //             "static-method",
        //             "instance-method",
        //             "abstract-method",
        //             "decorated-method",
        //             "method",
        //         ],

        //         order: "alphabetically",
        //     },
        // }],

        "@typescript-eslint/naming-convention": ["error", {
            selector: "default",
            format: ["camelCase", "UPPER_CASE"],
            leadingUnderscore: "forbid",
        }, {
            selector: "enumMember",
            format: ["UPPER_CASE"],
        }, {
            selector: "variable",
            format: ["camelCase", "UPPER_CASE"],
        }, {
            selector: "memberLike",
            modifiers: ["private"],
            format: ["camelCase"],
            leadingUnderscore: "allow",
        }, {
            selector: "typeLike",
            format: ["PascalCase"],
        }],

        "@typescript-eslint/no-dynamic-delete": ["error"],
        "@typescript-eslint/no-empty-function": ["error"],
        "@typescript-eslint/no-empty-interface": ["warn"],
        "@typescript-eslint/no-explicit-any": ["off"],

        "@/no-extra-parens": ["error", "all", {
            nestedBinaryExpressions: false,
        }],

        "@/no-extra-semi": ["error"],
        "@typescript-eslint/no-floating-promises": ["error"],
        "@typescript-eslint/no-for-in-array": ["error"],

        "@typescript-eslint/no-inferrable-types": ["error", {
            ignoreParameters: true,
        }],

        "@typescript-eslint/no-misused-new": ["error"],
        "@typescript-eslint/no-namespace": ["error"],
        "@typescript-eslint/no-non-null-assertion": ["error"],
        "@typescript-eslint/no-parameter-properties": ["off"],

        "@typescript-eslint/no-shadow": ["error", {
            hoist: "all",
        }],

        "@typescript-eslint/no-unnecessary-qualifier": ["error"],
        "@typescript-eslint/no-unnecessary-type-assertion": ["error"],
        "@typescript-eslint/no-unused-expressions": ["error"],
        "@typescript-eslint/no-use-before-define": ["off"],
        "@typescript-eslint/no-var-requires": ["off"],
        "@typescript-eslint/prefer-for-of": ["warn"],
        "@typescript-eslint/prefer-function-type": ["error"],
        "@typescript-eslint/prefer-namespace-keyword": ["error"],
        "@typescript-eslint/prefer-readonly": ["error"],
        "@typescript-eslint/prefer-reduce-type-parameter": ["error"],
        "@/quotes": ["error", "single"],
        "@/semi": ["error", "always"],

        "@/space-before-function-paren": ["error", {
            anonymous: "always",
            named: "never",
            asyncArrow: "always",
        }],

        "@typescript-eslint/triple-slash-reference": ["error", {
            path: "always",
            types: "prefer-import",
            lib: "always",
        }],

        // "@typescript-eslint/type-annotation-spacing": ["error"],
        "@typescript-eslint/unified-signatures": ["warn"],

        "array-bracket-newline": ["error", {
            minItems: 1,
        }],

        "array-bracket-spacing": ["error"],
        "array-element-newline": ["error"],
        "arrow-body-style": ["error"],
        "arrow-parens": ["error"],
        "arrow-spacing": ["error"],
        "block-spacing": ["error"],
        "brace-style": ["off"],

        "comma-dangle": ["error", {
            arrays: "always-multiline",
            objects: "always-multiline",
            imports: "always-multiline",
            exports: "always-multiline",
            functions: "always-multiline",
        }],

        "comma-spacing": ["error"],
        "comma-style": ["error"],
        complexity: ["off"],
        "computed-property-spacing": ["error"],
        "consistent-this": ["error"],
        "constructor-super": ["error"],
        curly: ["error"],
        "default-case": ["error"],
        "default-param-last": ["error"],
        "dot-notation": ["error"],
        "eol-last": ["error"],
        eqeqeq: ["error", "always"],
        "func-call-spacing": ["off"],

        "func-style": ["error", "declaration", {
            allowArrowFunctions: true,
        }],

        "function-call-argument-newline": ["error", "always"],
        "function-paren-newline": ["error"],
        "guard-for-in": ["error"],

        "id-blacklist": [
            "error",
            "any",
            "Number",
            "number",
            "String",
            "string",
            "Boolean",
            "boolean",
            "Undefined",
            "undefined",
        ],

        "id-match": ["error"],
        "implicit-arrow-linebreak": ["error"],
        "import/no-deprecated": ["warn"],

        "import/no-extraneous-dependencies": ["error", {
            devDependencies: false,
        }],

        "import/no-unassigned-import": ["warn"],
        "import/order": ["error"],
        indent: ["off"],
        "jsdoc/check-alignment": ["error"],
        "jsdoc/check-indentation": ["error"],
        // "jsdoc/newline-after-description": ["error"],
        "jsdoc/no-types": ["error"],
        "key-spacing": ["error"],
        "keyword-spacing": ["error"],
        "linebreak-style": ["error"],

        "lines-around-comment": ["error", {
            allowArrayStart: true,
            allowBlockStart: true,
            allowClassStart: true,
            allowObjectStart: true,
            beforeBlockComment: true,
        }],

        "lines-between-class-members": ["error"],
        "max-classes-per-file": ["off"],

        "max-len": ["error", {
            code: 160,
            ignoreRegExpLiterals: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
            ignoreUrls: true,
            tabWidth: 2,
        }],

        // "modules-newline/import-declaration-newline": ["error"],
        "modules-newline/export-declaration-newline": ["error"],
        "multiline-ternary": ["error", "never"],
        "new-cap": ["error"],
        "new-parens": ["error"],
        "no-array-constructor": ["error"],
        "no-bitwise": ["error"],
        "no-caller": ["error"],
        "no-cond-assign": ["error"],
        "no-confusing-arrow": ["error"],

        "no-console": ["error", {
            allow: [
                "log",
                "warn",
                "dir",
                "timeLog",
                "assert",
                "clear",
                "count",
                "countReset",
                "group",
                "groupEnd",
                "table",
                "dirxml",
                "error",
                "groupCollapsed",
                "Console",
                "profile",
                "profileEnd",
                "timeStamp",
                "context",
            ],
        }],

        "no-debugger": ["error"],
        "no-duplicate-case": ["error"],
        "no-duplicate-imports": ["error"],

        "no-empty": ["error", {
            allowEmptyCatch: true,
        }],

        "no-empty-function": ["off"],
        "no-eval": ["error"],
        "no-extra-parens": ["off"],
        "no-extra-semi": ["off"],
        "no-fallthrough": ["error"],
        "no-floating-decimal": ["error"],
        "no-invalid-this": ["error"],
        "no-lonely-if": ["error"],
        "no-mixed-operators": ["error"],
        "no-multi-spaces": ["error"],

        "no-multiple-empty-lines": ["error", {
            max: 1,
            maxBOF: 0,
            maxEOF: 0,
        }],

        "no-new-wrappers": ["error"],
        "no-redeclare": ["error"],
        "no-restricted-imports": ["error", "rxjs/Rx"],
        "no-self-compare": ["error"],
        "no-sequences": ["error"],
        "no-shadow": ["off"],
        "no-tabs": ["error"],
        "no-throw-literal": ["error"],
        "no-trailing-spaces": ["error"],
        "no-undef-init": ["error"],
        "no-underscore-dangle": ["off"],
        "no-unmodified-loop-condition": ["error"],
        "no-unsafe-finally": ["error"],
        "no-unused-expressions": ["error"],
        "no-unused-labels": ["error"],
        "no-use-before-define": ["error"],
        "no-var": ["warn"],
        "no-void": ["error"],
        "no-whitespace-before-property": ["error"],

        "object-curly-newline": ["error", {
            ObjectExpression: {
                minProperties: 1,
            },

            ObjectPattern: {
                multiline: true,
            },

            ImportDeclaration: {
                multiline: true,
            },

            ExportDeclaration: {
                multiline: true,
            },
        }],

        "object-curly-spacing": ["error", "always"],
        "object-property-newline": ["error"],
        "object-shorthand": ["error"],
        "one-var": ["error", "never"],
        "padded-blocks": ["error", "never"],

        "padding-line-between-statements": ["error", {
            blankLine: "always",
            prev: "*",
            next: "return",
        }],

        "prefer-arrow/prefer-arrow-functions": ["error"],
        "prefer-const": ["warn"],
        "quote-props": ["error", "as-needed"],
        quotes: ["off"],
        radix: ["error"],
        semi: ["off"],
        "semi-spacing": ["error"],
        "semi-style": ["error"],
        "sort-imports": ["off"],
        "sort-keys": ["error"],
        "sort-vars": ["error"],
        "space-before-blocks": ["error"],

        "space-before-function-paren": ["error", {
            anonymous: "never",
            asyncArrow: "always",
            named: "never",
        }],

        "space-in-parens": ["error"],
        "switch-colon-spacing": ["error"],
        "use-isnan": ["error"],
        "valid-typeof": ["off"],
        yoda: ["error"],

        // "@typescript-eslint/tslint/config": ["error", {
        //     rules: {
        //         "import-spacing": true,
        //         typedef: [true, "call-signature"],

        //         whitespace: [
        //             true,
        //             "check-branch",
        //             "check-decl",
        //             "check-operator",
        //             "check-separator",
        //             "check-type",
        //             "check-typecast",
        //         ],
        //     },
        // }],
    },
}];