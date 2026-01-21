import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import LoginForm from './_components/login-form'
import Link from 'next/link'

const LoginPage = () => {
  return (
    <div className="h-screen w-screen">
      <div className="flex h-screen flex-col items-center justify-center gap-6">
        {/* <Image
          src="/logo-kronos.svg"
          alt="Kronos CRM Logo"
          width={150}
          height={40}
          priority
        /> */}
        <Card className="h-fit w-full max-w-[400px] text-center">
          <CardHeader>
            <CardTitle>
              <h1 className="text-2xl font-semibold">Faça seu login</h1>
            </CardTitle>
            <CardDescription>
              <p className="text-sm">Acesse sua conta rapidamente</p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
          <CardFooter className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <p className="">Não tem conta? </p>
            <Link
              className="font-semibold text-primary hover:text-primary-foreground"
              href="/sign-up"
            >
              Criar conta
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
