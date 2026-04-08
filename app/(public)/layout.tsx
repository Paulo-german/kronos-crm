import Link from 'next/link'
import { KronosLogo } from '@/_components/icons/kronos-logo'
import { Button } from '@/_components/ui/button'

interface PublicLayoutProps {
  children: React.ReactNode
}

const PublicLayout = ({ children }: PublicLayoutProps) => {
  return (
    <div className="flex h-dvh flex-col overflow-y-auto bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          {/* Logo + Nome */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground transition-opacity hover:opacity-80"
          >
            <KronosLogo className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold tracking-tight">KRONOS</span>
          </Link>

          {/* Navegação */}
          <nav className="hidden items-center gap-1 sm:flex">
            <Link
              href="/changelog"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Changelog
            </Link>
            <Link
              href="/status"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Status
            </Link>
            <Link
              href="/help"
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
            >
              Central de Ajuda
            </Link>
          </nav>

          {/* CTA */}
          <Button variant="outline" size="sm" asChild>
            <Link href="/login">Entrar</Link>
          </Button>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 sm:flex-row">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <KronosLogo className="h-4 w-4 text-muted-foreground/60" />
            <span>
              &copy; {new Date().getFullYear()} Kronos CRM. Todos os direitos reservados.
            </span>
          </div>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/changelog" className="transition-colors hover:text-foreground">
              Changelog
            </Link>
            <Link href="/status" className="transition-colors hover:text-foreground">
              Status
            </Link>
            <Link href="/help" className="transition-colors hover:text-foreground">
              Ajuda
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
