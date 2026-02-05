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
        <CardFooter className="flex flex-col gap-3">
          <div className="flex w-full gap-3">
            <Button
              asChild
              className="flex-1 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40"
              variant="outline"
            >
              <Link href="https://mail.google.com" target="_blank">
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  className="mr-2 h-4 w-4"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z" />
                </svg>
                Gmail
              </Link>
            </Button>
            <Button
              asChild
              className="flex-1 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-950/40"
              variant="outline"
            >
              <Link href="https://outlook.live.com" target="_blank">
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  className="mr-2 h-4 w-4"
                  fill="currentColor"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M1 12.5v7.505h7.288V12.5H1zm7.293-6.619V1.16H1.006v4.721H8.288zm8.688-2.67c-1.35 0-2.61.272-3.702.774v3.15c.995-.6 2.164-.954 3.43-.954 2.898 0 4.296 1.66 4.296 4.364v.308l-3.327-.1c-3.174-.093-5.32 1.341-5.32 3.84 0 2.231 1.764 3.738 4.376 3.738 1.638 0 2.914-.658 3.714-1.748.163 1.258 1.242 1.954 2.656 1.706V16.6l-.16.002c-1.27.01-1.633-.65-1.633-1.428V8.14c0-3.335-2.222-4.93-4.329-4.93zm.065 9.077c.89 0 1.625.32 2.113.84v.05c-.09 1.543-1.096 2.378-2.26 2.378-1.125 0-1.858-.692-1.858-1.801 0-1.07.752-1.468 2.005-1.468z" />
                </svg>
                Outlook
              </Link>
            </Button>
          </div>

          <Button asChild className="w-full" variant="ghost">
            <Link href="/login">Voltar para o Login</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
