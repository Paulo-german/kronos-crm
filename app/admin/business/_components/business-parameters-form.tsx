'use client'

import { useMemo } from 'react'
import { useFieldArray } from 'react-hook-form'
import { NumericFormat } from 'react-number-format'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import type { UseFormReturn } from 'react-hook-form'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import type { UpdateBusinessReportInput } from '@/_actions/business-report/update-business-report/schema'

const fmt = {
  brl: (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
}

interface BusinessParametersFormProps {
  form: UseFormReturn<UpdateBusinessReportInput>
  onSubmit: (values: UpdateBusinessReportInput) => void
  isPending: boolean
}

export function BusinessParametersForm({
  form,
  onSubmit,
  isPending,
}: BusinessParametersFormProps) {
  const { isDirty } = form.formState

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'costItems',
  })

  const watchedItems = form.watch('costItems')
  const totalFixed = useMemo(
    () => watchedItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [watchedItems],
  )

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Card 1: Lista dinâmica de custos fixos */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Custos fixos mensais</CardTitle>
              <CardDescription className="text-xs">
                Adicione cada custo fixo com nome e valor em R$.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum custo cadastrado. Adicione o primeiro abaixo.
                </p>
              ) : (
                fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-2">
                    <FormField
                      control={form.control}
                      name={`costItems.${index}.name`}
                      render={({ field: nameField }) => (
                        <FormItem className="flex-1">
                          <FormLabel className="sr-only">Nome do custo</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Vercel" {...nameField} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`costItems.${index}.amount`}
                      render={({ field: amountField }) => (
                        <FormItem className="w-36">
                          <FormLabel className="sr-only">Valor (R$)</FormLabel>
                          <FormControl>
                            <NumericFormat
                              customInput={Input}
                              thousandSeparator="."
                              decimalSeparator=","
                              prefix="R$ "
                              decimalScale={2}
                              allowNegative={false}
                              placeholder="R$ 0,00"
                              value={Number(amountField.value) || 0}
                              onValueChange={(values) =>
                                amountField.onChange(values.floatValue ?? 0)
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => remove(index)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remover custo</span>
                    </Button>
                  </div>
                ))
              )}

              <div className="border-t pt-3 text-sm text-muted-foreground">
                Total fixo:{' '}
                <span className="font-semibold text-foreground">
                  {fmt.brl(totalFixed)}
                </span>
              </div>

              <Button
                variant="outline"
                type="button"
                size="sm"
                onClick={() => append({ name: '', amount: 0 })}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar custo
              </Button>
            </CardContent>
          </Card>

          {/* Card 2: Parâmetros de IA & meta */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Parâmetros & meta</CardTitle>
              <CardDescription className="text-xs">
                Custo total mensal de IA (somando todos os modelos) e margem alvo desejada.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="aiMonthlyCostBrl"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Custo total de IA no mês (R$)</FormLabel>
                    <FormControl>
                      <NumericFormat
                        customInput={Input}
                        thousandSeparator="."
                        decimalSeparator=","
                        prefix="R$ "
                        decimalScale={2}
                        allowNegative={false}
                        placeholder="R$ 0,00"
                        value={Number(field.value) || 0}
                        onValueChange={(values) =>
                          field.onChange(values.floatValue ?? 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="targetMarginPct"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Margem alvo (%)</FormLabel>
                    <FormControl>
                      <NumericFormat
                        customInput={Input}
                        suffix=" %"
                        decimalScale={0}
                        allowNegative={false}
                        placeholder="30 %"
                        isAllowed={(values) =>
                          !values.floatValue || values.floatValue <= 99
                        }
                        value={Number(field.value) || 0}
                        onValueChange={(values) =>
                          field.onChange(values.floatValue ?? 0)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        {/* Botão de submit */}
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty || isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar alterações
          </Button>
        </div>
      </form>
    </Form>
  )
}
