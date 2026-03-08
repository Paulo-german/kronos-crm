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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import type { SectionProps } from './types'

export const AdvancedSection = ({ form, canManage }: SectionProps) => {
  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Instruções Adicionais</CardTitle>
        <CardDescription>
          Para instruções avançadas em formato livre. Este texto é adicionado após as configurações acima.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="systemPrompt"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Prompt livre</FormLabel>
                <span className="text-xs text-muted-foreground">
                  {field.value.length} caracteres
                </span>
              </div>
              <FormControl>
                <Textarea
                  placeholder="Instruções adicionais em formato livre..."
                  className="min-h-[120px] resize-y"
                  {...field}
                  disabled={!canManage}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  )
}
