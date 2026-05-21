import { Input } from '@/_components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { AGENT_TIERS } from '@/_lib/ai/models'
import type { SectionProps } from './types'

export const ModelBehaviorSection = ({ form, canManage }: SectionProps) => {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Modelo e Comportamento
        </CardTitle>
        <CardDescription>
          Modelo de IA e configurações de processamento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="modelId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Modelo</FormLabel>
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={!canManage}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AGENT_TIERS.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      <div className="flex items-baseline gap-2">
                        <span>{tier.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {tier.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="debounceSeconds"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tempo de Espera (segundos)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={field.value}
                  onChange={(event) =>
                    field.onChange(Number(event.target.value))
                  }
                  disabled={!canManage}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Segundos de espera antes de processar mensagens agrupadas.
                <span className="font-semibold text-primary">
                  Atenção, um tempo de espera muito curto pode gerar respostas
                  duplicadas.
                </span>
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

      </CardContent>
    </Card>
  )
}
