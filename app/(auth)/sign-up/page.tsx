import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import SignUpForm from './_components/sign-up-form'
import Link from 'next/link'

const SignUpPage = () => {
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
              <h1 className="text-2xl font-semibold">Crie sua conta</h1>
            </CardTitle>
            <CardDescription>
              <p className="text-sm">Comece a vender mais com a Kronos</p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SignUpForm />
          </CardContent>
          <CardFooter className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
            <p>Já tem uma conta?</p>
            <Link
              className="font-semibold text-primary hover:text-primary-foreground"
              href="/login"
            >
              Fazer login
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default SignUpPage
