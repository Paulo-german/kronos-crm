import { Button } from '@/_components/ui/button'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'

export default function VerifyEmailPage() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-3 ring-1 ring-primary/20">
              <MailCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            Verifique seu email
          </CardTitle>
          <CardDescription className="text-base">
            Enviamos um link de confirmação para o seu endereço de email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Para acessar sua conta, clique no link enviado. Se não encontrar,
            verifique sua caixa de spam.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button asChild className="w-full" variant="outline">
            <Link href="/login">Voltar para o Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
