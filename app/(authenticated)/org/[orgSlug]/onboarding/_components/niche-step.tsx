'use client'

import { useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/_components/ui/button'
import { BLUEPRINTS } from '@/_lib/onboarding/blueprints'
import { saveNiche } from '@/_actions/onboarding/save-niche'
import { NicheCard } from './niche-card'

interface NicheStepProps {
  onComplete: (niche: string) => void
  initialNiche?: string | null
}

export function NicheStep({ onComplete, initialNiche }: NicheStepProps) {
  const [selectedNiche, setSelectedNiche] = useState<string | null>(
    initialNiche ?? null,
  )

  const { execute, isPending } = useAction(saveNiche, {
    onSuccess: ({ data }) => {
      if (data?.niche) {
        toast.success('Segmento salvo com sucesso!')
        onComplete(data.niche)
      }
    },
    onError: ({ error }) => {
      toast.error(
        error.serverError ?? 'Erro ao salvar segmento. Tente novamente.',
      )
    },
  })

  const handleContinue = () => {
    if (!selectedNiche) return
    execute({ niche: selectedNiche })
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Qual o segmento do seu negócio?
        </h2>
        <p className="text-muted-foreground">
          Escolha o segmento que melhor representa sua empresa. Isso nos ajuda a
          pré-configurar seu CRM com as melhores práticas do seu mercado.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Selecione o segmento do seu negócio"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        {BLUEPRINTS.map((blueprint, index) => (
          <NicheCard
            key={blueprint.key}
            nicheKey={blueprint.key}
            label={blueprint.label}
            description={blueprint.description}
            icon={blueprint.icon}
            isSelected={selectedNiche === blueprint.key}
            onSelect={setSelectedNiche}
            index={index}
          />
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          size="lg"
          disabled={!selectedNiche || isPending}
          onClick={handleContinue}
        >
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Continuar
        </Button>
      </div>
    </div>
  )
}
