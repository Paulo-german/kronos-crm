import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Switch } from '@/_components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import type { SectionProps } from './types'

export const BasicSettingsSection = ({ form, canManage }: SectionProps) => {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Configurações Básicas</CardTitle>
        <CardDescription>
          Nome, prompt e status do agente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} disabled={!canManage} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Prompt do Sistema</FormLabel>
                <span className="text-xs text-muted-foreground">
                  {field.value.length} caracteres
                </span>
              </div>
              <FormControl>
                <Textarea
                  {...field}
                  className="min-h-[200px] resize-y"
                  disabled={!canManage}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-3 space-y-0">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={!canManage}
                />
              </FormControl>
              <FormLabel>Agente ativo</FormLabel>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
