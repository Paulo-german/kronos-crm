'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { saveBillingData } from '@/_actions/billing/save-billing-data'
import {
  saveBillingDataSchema,
  type SaveBillingDataInput,
} from '@/_actions/billing/save-billing-data/schema'
import type { PersonType } from '@prisma/client'

interface RegisterFormProps {
  defaultValues: {
    personType: PersonType | null
    taxId: string | null
    legalName: string | null
    tradeName: string | null
    billingContactName: string | null
    billingContactEmail: string | null
    billingContactPhone: string | null
    billingZipCode: string | null
    billingStreet: string | null
    billingNumber: string | null
    billingComplement: string | null
    billingNeighborhood: string | null
    billingCity: string | null
    billingState: string | null
  }
  nextUrl: string
  backUrl: string
}

export function RegisterForm({
  defaultValues,
  nextUrl,
  backUrl,
}: RegisterFormProps) {
  const router = useRouter()
  const [isLoadingCep, setIsLoadingCep] = useState(false)

  const form = useForm<SaveBillingDataInput>({
    resolver: zodResolver(saveBillingDataSchema),
    defaultValues: {
      personType: defaultValues.personType || 'PJ',
      taxId: defaultValues.taxId || '',
      legalName: defaultValues.legalName || '',
      tradeName: defaultValues.tradeName || '',
      billingContactName: defaultValues.billingContactName || '',
      billingContactEmail: defaultValues.billingContactEmail || '',
      billingContactPhone: defaultValues.billingContactPhone || '',
      billingZipCode: defaultValues.billingZipCode || '',
      billingStreet: defaultValues.billingStreet || '',
      billingNumber: defaultValues.billingNumber || '',
      billingComplement: defaultValues.billingComplement || '',
      billingNeighborhood: defaultValues.billingNeighborhood || '',
      billingCity: defaultValues.billingCity || '',
      billingState: defaultValues.billingState || '',
    },
  })

  const personType = form.watch('personType')

  const { execute, isPending } = useAction(saveBillingData, {
    onSuccess: () => {
      router.push(nextUrl)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao salvar dados cadastrais.')
    },
  })

  async function handleCepBlur() {
    const cep = form.getValues('billingZipCode')
    if (cep.length !== 8) return

    setIsLoadingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()

      if (data.erro) {
        toast.error('CEP não encontrado.')
        return
      }

      form.setValue('billingStreet', data.logradouro || '')
      form.setValue('billingNeighborhood', data.bairro || '')
      form.setValue('billingCity', data.localidade || '')
      form.setValue('billingState', data.uf || '')
    } catch {
      toast.error('Erro ao buscar CEP.')
    } finally {
      setIsLoadingCep(false)
    }
  }

  function onSubmit(data: SaveBillingDataInput) {
    execute(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tipo de Pessoa */}
        <FormField
          control={form.control}
          name="personType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de pessoa</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="PJ">Pessoa Jurídica (CNPJ)</SelectItem>
                  <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Identificação */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="taxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {personType === 'PJ' ? 'CNPJ' : 'CPF'}
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder={
                      personType === 'PJ'
                        ? '00000000000100'
                        : '00000000000'
                    }
                    maxLength={personType === 'PJ' ? 14 : 11}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="legalName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {personType === 'PJ' ? 'Razão Social' : 'Nome Completo'}
                </FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {personType === 'PJ' && (
          <FormField
            control={form.control}
            name="tradeName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome Fantasia</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Contato Financeiro */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Contato Financeiro
          </h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="billingContactName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billingContactEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="billingContactPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="11999999999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Endereço */}
        <div>
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Endereço de Faturamento
          </h3>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="billingZipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="00000000"
                        maxLength={8}
                        {...field}
                        onBlur={() => {
                          field.onBlur()
                          handleCepBlur()
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingStreet"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Rua</FormLabel>
                    <FormControl>
                      <Input disabled={isLoadingCep} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <FormField
                control={form.control}
                name="billingNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Numero</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingComplement"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Complemento</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="billingNeighborhood"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro</FormLabel>
                    <FormControl>
                      <Input disabled={isLoadingCep} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="billingCity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input disabled={isLoadingCep} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="billingState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input
                          maxLength={2}
                          disabled={isLoadingCep}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(backUrl)}
          >
            Voltar
          </Button>
          <Button type="submit" className="flex-1" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Continuar para pagamento
          </Button>
        </div>
      </form>
    </Form>
  )
}
