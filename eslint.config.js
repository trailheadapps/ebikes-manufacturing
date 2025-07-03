'use strict';

import { defineConfig } from 'eslint/config';
import eslintJs from '@eslint/js';
import jestPlugin from 'eslint-plugin-jest';
import salesforceLwcConfig from '@salesforce/eslint-config-lwc/recommended.js';
import globals from 'globals';

export default defineConfig([
    // Ignore dist and __lwr_cache__
    {
        ignores: ['dist/', '__lwr_cache__/']
    },
    // LWC configuration for client files
    {
        files: ['src/client/**/*.js'],
        extends: [salesforceLwcConfig],
        rules: {
            '@lwc/lwc/no-unknown-wire-adapters': 'off'
        }
    },
    // Node.js configuration for server files
    {
        files: ['src/server/**/*.js'],
        extends: [eslintJs.configs.recommended],
        languageOptions: {
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-console': 'off'
        }
    }
]);
