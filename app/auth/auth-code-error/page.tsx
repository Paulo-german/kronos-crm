import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'

interface AuthCodeErrorPageProps {
  searchParams: Promise<{ reason?: string }>
}

interface AuthErrorConfig {
  title: string
  message: string
  cta: string
  href: string
}

const configs: Record<string, AuthErrorConfig> = {
  recovery: {
    title: 'Link de recuperação inválido',
    message: 'O link para redefinir sua senha expirou ou já foi usado. Solicite um novo link de recuperação.',
    cta: 'Solicitar novo link',
    href: '/forgot-password',
  },
  signup: {
    title: 'Erro na confirmação',
    message: 'O link de confirmação expirou ou é inválido. Tente criar sua conta novamente.',
    cta: 'Tentar novamente',
    href: '/sign-up',
  },
  default: {
    title: 'Link inválido',
    message: 'Este link expirou ou é inválido. Volte para o login e tente novamente.',
    cta: 'Voltar para o login',
    href: '/login',
  },
}

const AuthCodeErrorPage = async ({ searchParams }: AuthCodeErrorPageProps) => {
  const { reason } = await searchParams
  const config = (reason ? configs[reason] : undefined) ?? configs.default

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-destructive/10 p-3 ring-1 ring-destructive/20">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">
            {config.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {config.message}
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="default">
            <Link href={config.href}>{config.cta}</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AuthCodeErrorPage
