import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Martian_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/_components/theme-provider'
import { Toaster } from '@/_components/ui/sonner'
import { TooltipProvider } from './_components/ui/tooltip'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
})

const martian = Martian_Mono({
  subsets: ['latin'],
  variable: '--font-martian',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Kronos Hub',
  description: 'Hub de Vendas',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className="w-auto overflow-y-hidden"
    >
      <body
        className={`${jakarta.variable} ${martian.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={500}>{children}</TooltipProvider>
          <Toaster position="bottom-right" />
        </ThemeProvider>
      </body>
    </html>
  )
}
