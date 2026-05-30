import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Formulário de Contato',
  robots: { index: false },
}

interface FormLayoutProps {
  children: React.ReactNode
}

// Layout isolado — sem header/footer; renderizado dentro de iframe pelo cliente
const FormLayout = ({ children }: FormLayoutProps) => {
  return <div className="min-h-screen bg-background">{children}</div>
}

export default FormLayout
