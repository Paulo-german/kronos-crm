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
    // Scripts de seed/manutenção e test runners (tsx): console.log de progresso/
    // resultado e ids curtos em callbacks são legítimos aqui — não são código de
    // aplicação. Cobre prisma/scripts, scripts/ (harness de dev) e qualquer __tests__.
    files: [
      'prisma/scripts/**/*.{ts,tsx}',
      'prisma/seed.ts',
      'scripts/**/*.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
    ],
    rules: {
      'no-console': 'off',
      'id-length': 'off',
    },
  },
]

export default eslintConfig
