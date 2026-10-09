import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Componentes generados por shadcn: exportan sus variantes `cva` (o, los de
    // reui, sus utilidades) junto al componente.
    files: ['src/components/ui/**/*.{ts,tsx}', 'src/components/reui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
  {
    // El time picker de reui normaliza espacios no separables con un regex que
    // los escribe literales.
    files: ['src/components/reui/**/*.{ts,tsx}'],
    rules: {
      'no-irregular-whitespace': ['error', { skipRegExps: true }],
    },
  },
])
