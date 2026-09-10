import nextTs from '../../prototype/node_modules/eslint-config-next/dist/typescript.js';
export default [...nextTs, { files: ['**/*.mts'], rules: { '@typescript-eslint/no-non-null-assertion': 'off' } }];
