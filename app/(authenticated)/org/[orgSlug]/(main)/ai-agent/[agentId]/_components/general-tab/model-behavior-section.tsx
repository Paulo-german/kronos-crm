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
import { MODEL_OPTIONS } from '../constants'
import type { SectionProps } from './types'

export const ModelBehaviorSection = ({ form, canManage }: SectionProps) => {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Modelo e Comportamento</CardTitle>
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
                  {MODEL_OPTIONS.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      <div className="flex flex-col">
                        <span>{model.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {model.description}
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
              <FormLabel>Debounce (segundos)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  max={30}
                  value={field.value}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  disabled={!canManage}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Segundos de espera antes de processar mensagens agrupadas.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
