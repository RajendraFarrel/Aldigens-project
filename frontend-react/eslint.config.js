import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      /*
       * Aturan baru dari preset react-hooks (React Compiler era) diperlakukan
       * sebagai warning, bukan error. Seluruh basis kode memakai pola mapan
       * `useEffect(() => { muat(); }, [])` dan nilai acak/tanggal di initializer
       * useState — pola ini valid dan aplikasi berjalan normal, namun ditandai
       * oleh aturan yang sangat ketat ini. Dibiarkan sebagai warning agar bisa
       * ditangani bertahap tanpa memblokir lint/build.
       */
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
      /*
       * File seperti ThemeContext/BarcodeLabel mengekspor komponen sekaligus
       * helper/konstanta. Ini hanya memengaruhi HMR (fast refresh) saat dev,
       * bukan perilaku produksi — jadikan warning.
       */
      'react-refresh/only-export-components': 'warn',
    },
  },
])
