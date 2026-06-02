// Forçar renderização dinâmica para que process.env seja lido em runtime,
// evitando que Next.js cache o valor da flag durante o build.
export const dynamic = 'force-dynamic'

export { default } from '@/_components/pages/agents-page'
