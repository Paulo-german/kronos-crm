import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { FlatCompat } from '@eslint/eslintrc'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Legibilidade e padrões do projeto
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-else-return': 'error',
      'id-length': [
        'warn',
        {
          min: 2,
          exceptions: ['_', 'i', 'e', 'x', 'y', 'z'],
          properties: 'never',
        },
      ],
    },
  },
  {
    // Scripts de seed/manutenção: console.log de progresso e ids curtos
    // em callbacks são legítimos aqui — não são código de aplicação.
    files: ['prisma/scripts/**/*.{ts,tsx}', 'prisma/seed.ts'],
    rules: {
      'no-console': 'off',
      'id-length': 'off',
    },
  },
]

export default eslintConfig
