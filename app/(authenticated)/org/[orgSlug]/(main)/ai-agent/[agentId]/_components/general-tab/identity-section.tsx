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
import { ROLE_OPTIONS } from '../constants'
import type { SectionProps } from './types'

export const IdentitySection = ({ form, canManage }: SectionProps) => {
  const watchRole = form.watch('promptConfig.role')

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Identidade do Agente</CardTitle>
        <CardDescription>
          Nome, papel e status do agente.
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
          name="promptConfig.role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Papel</FormLabel>
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
                  {ROLE_OPTIONS.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-baseline gap-2">
                        <span>{role.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {role.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchRole === 'custom' && (
          <FormField
            control={form.control}
            name="promptConfig.roleCustom"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Papel personalizado</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ex: Consultor financeiro"
                    {...field}
                    value={field.value ?? ''}
                    disabled={!canManage}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

      </CardContent>
    </Card>
  )
}
