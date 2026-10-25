import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import hooks from 'eslint-plugin-react-hooks';
export default [
 {ignores:['dist/**','coverage/**','node_modules/**']},
 {files:['**/*.{js,jsx}'],languageOptions:{ecmaVersion:'latest',sourceType:'module',parserOptions:{ecmaFeatures:{jsx:true}},globals:{...globals.browser,...globals.node,...globals.jest,vi:'readonly'}},plugins:{react,'react-hooks':hooks},settings:{react:{version:'detect'}},rules:{...js.configs.recommended.rules,'react/jsx-uses-vars':'error','react/jsx-uses-react':'error','react-hooks/rules-of-hooks':'error','react-hooks/exhaustive-deps':'warn','no-unused-vars':['warn',{argsIgnorePattern:'^_',varsIgnorePattern:'^_',caughtErrors:'none'}]}}
];
