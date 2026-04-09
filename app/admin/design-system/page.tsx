'use client'

import { useState } from 'react'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/_components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/_components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/_components/ui/sheet'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/_components/ui/tabs'

// ──────────────────────────────────────────────
// Tipos auxiliares
// ──────────────────────────────────────────────

interface SwatchItem {
  name: string
  tailwindClass: string
  label: string
}

interface SectionProps {
  title: string
  children: React.ReactNode
}

// ──────────────────────────────────────────────
// Dados: tokens e cores
// ──────────────────────────────────────────────

const BASE_TOKENS: SwatchItem[] = [
  { name: 'background', tailwindClass: 'bg-background', label: 'bg-background' },
  { name: 'foreground', tailwindClass: 'bg-foreground', label: 'bg-foreground' },
  { name: 'card', tailwindClass: 'bg-card', label: 'bg-card' },
  { name: 'card-foreground', tailwindClass: 'bg-card-foreground', label: 'bg-card-foreground' },
  { name: 'popover', tailwindClass: 'bg-popover', label: 'bg-popover' },
  { name: 'popover-foreground', tailwindClass: 'bg-popover-foreground', label: 'bg-popover-foreground' },
  { name: 'primary', tailwindClass: 'bg-primary', label: 'bg-primary' },
  { name: 'primary-foreground', tailwindClass: 'bg-primary-foreground', label: 'bg-primary-foreground' },
  { name: 'primary-dark', tailwindClass: 'bg-primary-dark', label: 'bg-primary-dark' },
  { name: 'secondary', tailwindClass: 'bg-secondary', label: 'bg-secondary' },
  { name: 'secondary-foreground', tailwindClass: 'bg-secondary-foreground', label: 'bg-secondary-foreground' },
  { name: 'muted', tailwindClass: 'bg-muted', label: 'bg-muted' },
  { name: 'muted-foreground', tailwindClass: 'bg-muted-foreground', label: 'bg-muted-foreground' },
  { name: 'accent', tailwindClass: 'bg-accent', label: 'bg-accent' },
  { name: 'accent-foreground', tailwindClass: 'bg-accent-foreground', label: 'bg-accent-foreground' },
  { name: 'destructive', tailwindClass: 'bg-destructive', label: 'bg-destructive' },
  { name: 'destructive-foreground', tailwindClass: 'bg-destructive-foreground', label: 'bg-destructive-foreground' },
  { name: 'border', tailwindClass: 'bg-border', label: 'bg-border' },
  { name: 'input', tailwindClass: 'bg-input', label: 'bg-input' },
  { name: 'ring', tailwindClass: 'bg-ring', label: 'bg-ring' },
  { name: 'tab', tailwindClass: 'bg-tab', label: 'bg-tab' },
  { name: 'tab-foreground', tailwindClass: 'bg-tab-foreground', label: 'bg-tab-foreground' },
]

const BRAND_TOKENS: SwatchItem[] = [
  { name: 'kronos-purple', tailwindClass: 'bg-kronos-purple', label: 'bg-kronos-purple' },
  { name: 'kronos-purple-light', tailwindClass: 'bg-[var(--kronos-purple-light)]', label: 'bg-kronos-purple-light' },
  { name: 'kronos-green', tailwindClass: 'bg-kronos-green', label: 'bg-kronos-green' },
  { name: 'kronos-green-light', tailwindClass: 'bg-[var(--kronos-green-light)]', label: 'bg-kronos-green-light' },
  { name: 'kronos-cyan', tailwindClass: 'bg-[var(--kronos-cyan)]', label: 'bg-kronos-cyan' },
  { name: 'kronos-pink', tailwindClass: 'bg-[var(--kronos-pink)]', label: 'bg-kronos-pink' },
  { name: 'kronos-blue', tailwindClass: 'bg-kronos-blue', label: 'bg-kronos-blue' },
  { name: 'kronos-red', tailwindClass: 'bg-kronos-red', label: 'bg-kronos-red' },
  { name: 'kronos-yellow', tailwindClass: 'bg-kronos-yellow', label: 'bg-kronos-yellow' },
]

const OPACITY_STEPS = [
  { label: '100%', cls: 'bg-background' },
  { label: '90%', cls: 'bg-background/90' },
  { label: '80%', cls: 'bg-background/80' },
  { label: '70%', cls: 'bg-background/70' },
  { label: '50%', cls: 'bg-background/50' },
  { label: '30%', cls: 'bg-background/30' },
  { label: '20%', cls: 'bg-background/20' },
  { label: '10%', cls: 'bg-background/10' },
]

const OVERLAY_STEPS = [
  { label: 'bg-black/80', sublabel: '(antigo)', cls: 'bg-black/80' },
  { label: 'bg-black/90', sublabel: '(atual)', cls: 'bg-black/90' },
  { label: 'bg-black/95', sublabel: '', cls: 'bg-black/95' },
  { label: 'bg-black', sublabel: '(100%)', cls: 'bg-black' },
]

// ──────────────────────────────────────────────
// Componentes auxiliares
// ──────────────────────────────────────────────

const Section = ({ title, children }: SectionProps) => (
  <section>
    <h2 className="mb-4 text-lg font-semibold">{title}</h2>
    {children}
  </section>
)

const ColorSwatch = ({ name, tailwindClass, label }: SwatchItem) => (
  <div className="flex flex-col items-center gap-2">
    <div
      className={`h-16 w-16 rounded-lg border border-border/60 ${tailwindClass}`}
    />
    <div className="space-y-0.5 text-center">
      <p className="text-xs font-medium text-foreground">{name}</p>
      <p className="font-mono text-[10px] text-muted-foreground">{label}</p>
    </div>
  </div>
)

/**
 * Variáveis CSS por tema — forçam as cores independente do tema global.
 * Isso é necessário porque a classe `dark` no `<html>` tem precedência
 * sobre a ausência dela num descendente.
 */
const LIGHT_VARS: React.CSSProperties = {
  '--background': '0 0% 100%',
  '--foreground': '240 10% 3.9%',
  '--card': '240 5% 96%',
  '--card-foreground': '240 10% 3.9%',
  '--tab': '0 0% 90%',
  '--tab-foreground': '240 10% 3.9%',
  '--popover': '0 0% 100%',
  '--popover-foreground': '240 10% 3.9%',
  '--primary': '261 74% 62%',
  '--primary-foreground': '261 74% 75%',
  '--primary-dark': '261 74% 25%',
  '--secondary': '240 4.8% 80%',
  '--secondary-foreground': '240 5.9% 10%',
  '--muted': '240 5% 89%',
  '--muted-foreground': '240 3.8% 46.1%',
  '--accent': '240 5% 91%',
  '--accent-foreground': '240 5.9% 10%',
  '--destructive': '0 84.2% 60.2%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '240 5.9% 80%',
  '--input': '240 5.9% 90%',
  '--ring': '261 74% 62%',
} as React.CSSProperties

const DARK_VARS: React.CSSProperties = {
  '--background': '240 10% 3.9%',
  '--foreground': '0 0% 98%',
  '--card': '240 6% 7%',
  '--card-foreground': '0 0% 98%',
  '--tab': '240 5.9% 10%',
  '--tab-foreground': '0 0% 98%',
  '--popover': '240 5.9% 10%',
  '--popover-foreground': '0 0% 98%',
  '--primary': '261 74% 62%',
  '--primary-foreground': '261 74% 75%',
  '--primary-dark': '261 74% 25%',
  '--secondary': '240 3.7% 15.9%',
  '--secondary-foreground': '0 0% 98%',
  '--muted': '240 3.7% 15.9%',
  '--muted-foreground': '240 5% 64.9%',
  '--accent': '240 3.7% 15.9%',
  '--accent-foreground': '0 0% 98%',
  '--destructive': '0 62.8% 50.6%',
  '--destructive-foreground': '0 0% 98%',
  '--border': '240 3.7% 15.9%',
  '--input': '240 3.7% 15.9%',
  '--ring': '261 74% 62%',
} as React.CSSProperties

const ThemePanel = ({
  mode,
  children,
}: {
  mode: 'dark' | 'light'
  children: React.ReactNode
}) => (
  <div
    style={mode === 'dark' ? DARK_VARS : LIGHT_VARS}
    className="rounded-xl border border-border bg-background p-6 text-foreground"
  >
    <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">
      {mode === 'dark' ? 'Dark Mode' : 'Light Mode'}
    </p>
    {children}
  </div>
)

// ──────────────────────────────────────────────
// Conteúdo reutilizável por tema
// ──────────────────────────────────────────────

const BaseColorsContent = () => (
  <div className="flex flex-wrap gap-6">
    {BASE_TOKENS.map((token) => (
      <ColorSwatch key={token.name} {...token} />
    ))}
  </div>
)

const BrandColorsContent = () => (
  <div className="flex flex-wrap gap-6">
    {BRAND_TOKENS.map((token) => (
      <ColorSwatch key={token.name} {...token} />
    ))}
  </div>
)

const OpacityContent = () => (
  <div className="rounded-xl border border-border bg-card p-6">
    <p className="mb-4 text-xs text-muted-foreground">
      Renderizado sobre <code className="font-mono">bg-card</code> para
      visualizar o efeito real de cada opacidade.
    </p>
    <div className="flex flex-wrap gap-4">
      {OPACITY_STEPS.map((step) => (
        <div key={step.label} className="flex flex-col items-center gap-2">
          <div
            className={`h-16 w-20 rounded-lg border border-border/60 ${step.cls}`}
          />
          <p className="font-mono text-[10px] text-muted-foreground">
            {step.label}
          </p>
          <p className="text-[10px] text-muted-foreground">{step.cls}</p>
        </div>
      ))}
    </div>
  </div>
)

const OverlayContent = () => (
  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
    {OVERLAY_STEPS.map((overlay) => (
      <div
        key={overlay.label}
        className="relative overflow-hidden rounded-xl border border-border"
      >
        <div className="bg-background p-4">
          <p className="text-sm font-medium text-foreground">
            Titulo do conteudo
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Texto de exemplo simulando a pagina por baixo do overlay.
          </p>
          <div className="mt-3 rounded-lg border border-border bg-card p-2">
            <p className="text-xs text-card-foreground">Mini card</p>
          </div>
        </div>
        <div
          className={`absolute inset-0 flex flex-col items-center justify-center gap-1 ${overlay.cls}`}
        >
          <p className="text-xs font-semibold text-white">
            {overlay.label}
          </p>
          {overlay.sublabel && (
            <p className="text-[10px] text-white/70">
              {overlay.sublabel}
            </p>
          )}
        </div>
      </div>
    ))}
  </div>
)

const ComponentsContent = ({
  onOpenDialog,
}: {
  onOpenDialog: () => void
}) => (
  <div className="space-y-8">
    {/* Buttons */}
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        Button — variantes
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="default">Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="soft">Soft</Button>
      </div>
    </div>

    {/* Badges */}
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        Badge — variantes
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="default">Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
      </div>
    </div>

    {/* Card */}
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        Card
      </p>
      <Card className="w-80">
        <CardHeader>
          <CardTitle>Titulo do Card</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Conteudo do card com texto descritivo de exemplo para
            visualizar o espacamento e tipografia padrao.
          </p>
        </CardContent>
      </Card>
    </div>

    {/* Dialog + Sheet */}
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        Dialog & Sheet
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={onOpenDialog}>
          Abrir Dialog
        </Button>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Abrir Sheet</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Sheet de Exemplo</SheetTitle>
              <SheetDescription>
                Overlay em <code className="font-mono text-xs">bg-black/90</code>.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                Conteudo do sheet para verificar opacidade e cor do fundo.
              </p>
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-card-foreground">
                  Card dentro do sheet
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>

    {/* Tabs */}
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">
        Tabs — padrao do projeto
      </p>
      <Tabs defaultValue="tab1" className="w-full max-w-md">
        <TabsList className="grid h-12 w-full grid-cols-3 rounded-md border border-border/50">
          <TabsTrigger
            value="tab1"
            className="rounded-md py-2"
          >
            Visao Geral
          </TabsTrigger>
          <TabsTrigger
            value="tab2"
            className="rounded-md py-2"
          >
            Detalhes
          </TabsTrigger>
          <TabsTrigger
            value="tab3"
            className="rounded-md py-2"
          >
            Historico
          </TabsTrigger>
        </TabsList>
        <TabsContent value="tab1" className="mt-3">
          <p className="text-sm text-muted-foreground">
            Conteudo da aba Visao Geral.
          </p>
        </TabsContent>
        <TabsContent value="tab2" className="mt-3">
          <p className="text-sm text-muted-foreground">
            Conteudo da aba Detalhes.
          </p>
        </TabsContent>
        <TabsContent value="tab3" className="mt-3">
          <p className="text-sm text-muted-foreground">
            Conteudo da aba Historico.
          </p>
        </TabsContent>
      </Tabs>
    </div>
  </div>
)

const TypographyContent = () => (
  <div className="space-y-5 rounded-xl border border-border bg-card p-6">
    <div className="flex items-baseline gap-4">
      <p className="w-56 font-mono text-xs text-muted-foreground">
        text-2xl font-bold
      </p>
      <p className="text-2xl font-bold">Titulo de pagina</p>
    </div>
    <div className="border-t border-border" />
    <div className="flex items-baseline gap-4">
      <p className="w-56 font-mono text-xs text-muted-foreground">
        text-lg font-semibold
      </p>
      <p className="text-lg font-semibold">Titulo de secao</p>
    </div>
    <div className="border-t border-border" />
    <div className="flex items-baseline gap-4">
      <p className="w-56 font-mono text-xs text-muted-foreground">
        text-sm text-muted-foreground
      </p>
      <p className="text-sm text-muted-foreground">Subtitulo descritivo</p>
    </div>
    <div className="border-t border-border" />
    <div className="flex items-baseline gap-4">
      <p className="w-56 font-mono text-xs text-muted-foreground">
        text-xs
      </p>
      <p className="text-xs">Label menor / metadado</p>
    </div>
    <div className="border-t border-border" />
    <div className="flex items-baseline gap-4">
      <p className="w-56 font-mono text-xs text-muted-foreground">
        font-mono
      </p>
      <p className="font-mono text-sm">
        const valor = &apos;codigo&apos;
      </p>
    </div>
  </div>
)

// ──────────────────────────────────────────────
// Pagina principal
// ──────────────────────────────────────────────

const DesignSystemPage = () => {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>Design System</HeaderTitle>
          <HeaderSubTitle>
            Tokens de cor, componentes e variantes do Kronos CRM — Dark & Light
          </HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="space-y-12">
        {/* ── Secao 1: Cores Base ── */}
        <Section title="1. Cores Base (CSS Variables)">
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemePanel mode="dark">
              <BaseColorsContent />
            </ThemePanel>
            <ThemePanel mode="light">
              <BaseColorsContent />
            </ThemePanel>
          </div>
        </Section>

        {/* ── Secao 2: Cores Kronos (Brand) ── */}
        <Section title="2. Cores Kronos (Brand)">
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemePanel mode="dark">
              <BrandColorsContent />
            </ThemePanel>
            <ThemePanel mode="light">
              <BrandColorsContent />
            </ThemePanel>
          </div>
        </Section>

        {/* ── Secao 3: Opacidades de Background ── */}
        <Section title="3. Opacidades de Background">
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemePanel mode="dark">
              <OpacityContent />
            </ThemePanel>
            <ThemePanel mode="light">
              <OpacityContent />
            </ThemePanel>
          </div>
        </Section>

        {/* ── Secao 4: Overlay do Dialog ── */}
        <Section title="4. Overlay do Dialog">
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemePanel mode="dark">
              <OverlayContent />
            </ThemePanel>
            <ThemePanel mode="light">
              <OverlayContent />
            </ThemePanel>
          </div>
        </Section>

        {/* ── Secao 5: Componentes shadcn ── */}
        <Section title="5. Componentes shadcn/ui">
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemePanel mode="dark">
              <ComponentsContent onOpenDialog={() => setDialogOpen(true)} />
            </ThemePanel>
            <ThemePanel mode="light">
              <ComponentsContent onOpenDialog={() => setDialogOpen(true)} />
            </ThemePanel>
          </div>

          {/* Dialog renderizado fora dos painéis para overlay funcionar */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog de Exemplo</DialogTitle>
                <DialogDescription>
                  Overlay em{' '}
                  <code className="font-mono text-xs">bg-black/90</code>.
                  Fundo do dialog em{' '}
                  <code className="font-mono text-xs">bg-background</code>.
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Fechar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </Section>

        {/* ── Secao 6: Tipografia ── */}
        <Section title="6. Tipografia">
          <div className="grid gap-6 xl:grid-cols-2">
            <ThemePanel mode="dark">
              <TypographyContent />
            </ThemePanel>
            <ThemePanel mode="light">
              <TypographyContent />
            </ThemePanel>
          </div>
        </Section>
      </div>
    </div>
  )
}

export default DesignSystemPage
