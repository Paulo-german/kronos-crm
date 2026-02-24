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

const AuthCodeErrorPage = () => {
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
            Erro na confirmação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            O link de confirmação expirou ou é inválido. Tente criar sua conta
            novamente.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild variant="default">
            <Link href="/sign-up">Tentar novamente</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}

export default AuthCodeErrorPage
