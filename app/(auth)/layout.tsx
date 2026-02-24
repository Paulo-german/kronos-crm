import { KronosLogo } from '@/_components/icons/kronos-logo'
import { RecaptchaProvider } from './_components/recaptcha-provider'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RecaptchaProvider>
      <div className="flex h-screen w-screen">
        {/* Painel esquerdo: gradiente premium (hidden no mobile) */}
        <div className="bg-banner-premium hidden w-[60%] flex-col items-center justify-center lg:flex">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
            <KronosLogo className="h-12 w-12 text-white" />
          </div>
        </div>

        {/* Painel direito: conteúdo */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto bg-background px-8 lg:px-16">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </RecaptchaProvider>
  )
}
