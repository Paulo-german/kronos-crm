import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import type { SectionProps } from './types'

export const CompanySection = ({ form, canManage }: SectionProps) => {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Empresa</CardTitle>
        <CardDescription>
          Informações sobre a empresa que o agente representa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <FormField
          control={form.control}
          name="promptConfig.companyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da empresa</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Kronos CRM"
                  {...field}
                  disabled={!canManage}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="promptConfig.companyDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição da empresa</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva o que a empresa faz, seus produtos e serviços..."
                  className="min-h-[100px] resize-y"
                  {...field}
                  disabled={!canManage}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="promptConfig.targetAudience"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Público-alvo</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Pequenas empresas de tecnologia"
                  {...field}
                  value={field.value ?? ''}
                  disabled={!canManage}
                />
              </FormControl>
              <FormDescription>
                Descreva o perfil dos clientes que o agente irá atender.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
