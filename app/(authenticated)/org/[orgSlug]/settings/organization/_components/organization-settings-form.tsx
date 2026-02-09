'use client'

import { useState, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Copy, Check, Loader2, Search, Sparkles } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { Switch } from '@/_components/ui/switch'
import { updateOrganization } from '@/_actions/organization/update-organization'
import {
  updateOrganizationSchema,
  type UpdateOrganizationInput,
} from '@/_actions/organization/update-organization/schema'
import { CnpjInput } from '@/_components/form-controls/cnpj-input'
import { CpfInput } from '@/_components/form-controls/cpf-input'
import { CepInput } from '@/_components/form-controls/cep-input'
import { PhoneInput } from '@/_components/form-controls/phone-input'
import { useCepLookup } from '@/_hooks/use-cep-lookup'
import { BRAZILIAN_STATES } from '@/_constants/brazilian-states'
import { formatDate, onlyNumbers } from '@/_lib/utils'
import type { PlanType } from '@/_lib/rbac/plan-limits'
import type { PersonType } from '@prisma/client'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
  slug: string
  createdAt: Date | string
  personType: PersonType | null
  taxId: string | null
  legalName: string | null
  tradeName: string | null
  isSimples: boolean
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
  billingCountry: string | null
}

interface OrganizationSettingsFormProps {
  orgSlug: string
  organization: Organization
  currentPlan: PlanType
}

export function OrganizationSettingsForm({
  orgSlug,
  organization,
  currentPlan,
}: OrganizationSettingsFormProps) {
  const [copied, setCopied] = useState(false)

  const numberInputRef = useRef<HTMLInputElement>(null)
  const { lookup, isLoading: isCepLoading } = useCepLookup()

  const form = useForm<UpdateOrganizationInput>({
    resolver: zodResolver(updateOrganizationSchema),
    defaultValues: {
      name: organization.name,
      personType: organization.personType,
      taxId: organization.taxId || '',
      legalName: organization.legalName || '',
      tradeName: organization.tradeName || '',
      isSimples: organization.isSimples,
      billingContactName: organization.billingContactName || '',
      billingContactEmail: organization.billingContactEmail || '',
      billingContactPhone: organization.billingContactPhone || '',
      billingZipCode: organization.billingZipCode || '',
      billingStreet: organization.billingStreet || '',
      billingNumber: organization.billingNumber || '',
      billingComplement: organization.billingComplement || '',
      billingNeighborhood: organization.billingNeighborhood || '',
      billingCity: organization.billingCity || '',
      billingState: organization.billingState || '',
      billingCountry: organization.billingCountry || 'BR',
    },
  })

  const personType = useWatch({ control: form.control, name: 'personType' })
  const organizationIsPJ = personType === 'PJ'
  const organizationIsPF = personType === 'PF'

  const { execute, isPending } = useAction(updateOrganization, {
    onSuccess: () => {
      toast.success('Organização atualizada com sucesso!')
      form.reset(form.getValues())
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao atualizar organização.')
    },
  })

  const onSubmit = (data: UpdateOrganizationInput) => {
    const cleanData = {
      ...data,
      taxId: onlyNumbers(data.taxId) || null,
      billingContactPhone: onlyNumbers(data.billingContactPhone) || null,
      billingZipCode: onlyNumbers(data.billingZipCode) || null,
      billingContactEmail: data.billingContactEmail || null,
    }
    execute(cleanData)
  }

  const handleCopySlug = async () => {
    try {
      await navigator.clipboard.writeText(organization.slug)
      setCopied(true)
      toast.success('Slug copiado!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar slug.')
    }
  }

  const handleCepLookup = async () => {
    try {
      const cep = form.getValues('billingZipCode')
      if (!cep) return

      const data = await lookup(cep)
      if (data) {
        form.setValue('billingStreet', data.street)
        form.setValue('billingNeighborhood', data.neighborhood)
        form.setValue('billingCity', data.city)
        form.setValue('billingState', data.state)
        toast.success('Endereço encontrado!')
        setTimeout(() => numberInputRef.current?.focus(), 100)
      } else {
        toast.error('CEP não encontrado.')
      }
    } catch {
      toast.error('Erro ao buscar CEP.')
    }
  }

  const formattedDate = formatDate(organization.createdAt)

  const isFree = currentPlan === 'free'

  const planLabels: Record<PlanType, string> = {
    free: 'Gratuito',
    pro: 'Pro',
    enterprise: 'Enterprise',
  }

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Card 1: Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Dados gerais da organização.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da organização</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da organização" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">
                  Identificador (slug)
                </Label>
                <div className="flex items-center gap-2">
                  <code className="rounded bg-muted px-2 py-1 text-sm">
                    {organization.slug}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopySlug}
                    type="button"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Plano atual
                  </Label>
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium">
                      {planLabels[currentPlan]}
                    </p>
                    <Link href={`/org/${orgSlug}/settings/billing`}>
                      <Button type="button">
                        {isFree ? 'Assinar' : 'Upgrade'}
                      </Button>
                    </Link>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">
                    Criada em
                  </Label>
                  <p className="text-sm font-medium">{formattedDate}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Dados Cadastrais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Cadastrais</CardTitle>
              <CardDescription>
                Informações fiscais e jurídicas da organização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="personType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de pessoa</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="PJ">
                          Pessoa Jurídica (CNPJ)
                        </SelectItem>
                        <SelectItem value="PF">Pessoa Física (CPF)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(organizationIsPJ || organizationIsPF) && (
                <>
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {organizationIsPJ ? 'CNPJ' : 'CPF'}
                        </FormLabel>
                        <FormControl>
                          {organizationIsPJ ? (
                            <CnpjInput
                              value={field.value || ''}
                              onValueChange={(values) =>
                                field.onChange(values.value)
                              }
                            />
                          ) : (
                            <CpfInput
                              value={field.value || ''}
                              onValueChange={(values) =>
                                field.onChange(values.value)
                              }
                            />
                          )}
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
                          {organizationIsPJ ? 'Razão Social' : 'Nome Completo'}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={
                              organizationIsPJ
                                ? 'Razão Social da empresa'
                                : 'Nome completo conforme documento'
                            }
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {organizationIsPJ && (
                    <>
                      <FormField
                        control={form.control}
                        name="tradeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Fantasia</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Nome fantasia da empresa"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="isSimples"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Optante pelo Simples Nacional
                              </FormLabel>
                              <FormDescription>
                                Marque se a empresa é optante pelo Simples
                                Nacional.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Card 3: Contato Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle>Contato Financeiro</CardTitle>
              <CardDescription>
                Responsável pelo financeiro da organização.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="billingContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do responsável</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nome completo do responsável"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billingContactEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="financeiro@empresa.com"
                          {...field}
                          value={field.value || ''}
                        />
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
                        <PhoneInput
                          value={field.value || ''}
                          onValueChange={(values) =>
                            field.onChange(values.value)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Endereço de Faturamento */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço de Faturamento</CardTitle>
              <CardDescription>
                Endereço para emissão de notas fiscais.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="billingZipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CEP</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <CepInput
                          value={field.value || ''}
                          onValueChange={(values) =>
                            field.onChange(values.value)
                          }
                          onBlur={() => {
                            const cep = field.value?.replace(/\D/g, '')
                            if (cep && cep.length === 8) {
                              handleCepLookup()
                            }
                          }}
                          className="max-w-[180px]"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleCepLookup}
                        disabled={isCepLoading}
                      >
                        {isCepLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                        <span className="ml-2 hidden sm:inline">Buscar</span>
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="billingStreet"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Rua, Avenida, etc."
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="123"
                          {...field}
                          ref={(el) => {
                            field.ref(el)
                            numberInputRef.current = el
                          }}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="billingComplement"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Sala, Andar, Bloco (opcional)"
                          {...field}
                          value={field.value || ''}
                        />
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
                        <Input
                          placeholder="Bairro"
                          {...field}
                          value={field.value || ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <FormField
                  control={form.control}
                  name="billingCity"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-1">
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Cidade"
                          {...field}
                          value={field.value || ''}
                        />
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
                      <FormLabel>Estado</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || undefined}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {BRAZILIAN_STATES.map((state) => (
                            <SelectItem key={state.value} value={state.value}>
                              {state.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="billingCountry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>País</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="BR"
                          {...field}
                          value={field.value || 'BR'}
                          disabled
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Botão Salvar */}
          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isPending || !form.formState.isDirty}
              className="w-full sm:w-auto"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar alterações
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
