'use client'

import { Dispatch, SetStateAction } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Control, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import {
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
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
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Separator } from '@/_components/ui/separator'
import { Loader2 } from 'lucide-react'
import { createAgent } from '@/_actions/agent/create-agent'
import {
  createAgentSchema,
  type CreateAgentInput,
} from '@/_actions/agent/create-agent/schema'
import type { UpdateAgentInput } from '@/_actions/agent/update-agent/schema'
import {
  ROLE_OPTIONS,
  TONE_OPTIONS,
  RESPONSE_LENGTH_OPTIONS,
  LANGUAGE_OPTIONS,
} from '../[agentId]/_components/constants'
import { z } from 'zod'

const editAgentSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio'),
  isActive: z.boolean(),
})

type EditAgentInput = z.infer<typeof editAgentSchema>

interface CreateAgentPromptFieldsProps {
  control: Control<CreateAgentInput>
}

const CreateAgentPromptFields = ({ control }: CreateAgentPromptFieldsProps) => {
  const watchRole = useWatch({ control, name: 'promptConfig.role' })

  return (
    <>
      {/* Identidade */}
      <FormField
        control={control}
        name="promptConfig.role"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Papel *</FormLabel>
            <Select value={field.value} onValueChange={field.onChange}>
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
          control={control}
          name="promptConfig.roleCustom"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Papel personalizado *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Consultor financeiro"
                  {...field}
                  value={field.value ?? ''}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <Separator />

      {/* Empresa */}
      <FormField
        control={control}
        name="promptConfig.companyName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Empresa *</FormLabel>
            <FormControl>
              <Input placeholder="Ex: Kronos CRM" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="promptConfig.companyDescription"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Descrição da empresa *</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Descreva brevemente o que a empresa faz..."
                className="min-h-[80px] resize-y"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator />

      {/* Comunicação */}
      <div className="grid gap-4 md:grid-cols-2">
        <FormField
          control={control}
          name="promptConfig.tone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tom de voz</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {TONE_OPTIONS.map((tone) => (
                    <SelectItem key={tone.value} value={tone.value}>
                      {tone.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="promptConfig.responseLength"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tamanho das respostas</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RESPONSE_LENGTH_OPTIONS.map((length) => (
                    <SelectItem key={length.value} value={length.value}>
                      <div className="flex items-baseline gap-2">
                        <span>{length.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {length.description}
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

        <FormField
          control={control}
          name="promptConfig.language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idioma</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="promptConfig.useEmojis"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-3 space-y-0 self-end rounded-md border border-border/50 px-4 py-3">
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Usar emojis</FormLabel>
            </FormItem>
          )}
        />
      </div>

      <Separator />

      {/* Modo de resposta */}
      <FormField
        control={control}
        name="agentVersion"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Modo de resposta</FormLabel>
            <Select
              value={field.value ?? 'v1'}
              onValueChange={field.onChange}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="v1">
                  <div className="flex items-baseline gap-2">
                    <span>Padrão</span>
                    <span className="text-xs text-muted-foreground">
                      Respostas diretas e econômicas.
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="v2">
                  <div className="flex items-baseline gap-2">
                    <span>v2</span>
                    <span className="text-xs text-muted-foreground">
                      Em desenvolvimento.
                    </span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  )
}

interface UpsertAgentSheetContentProps {
  defaultValues?: { id: string; name: string; isActive: boolean }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateAgentInput) => void
  isUpdating?: boolean
}

const UpsertAgentSheetContent = ({
  defaultValues,
  setIsOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
}: UpsertAgentSheetContentProps) => {
  const isEditing = !!defaultValues?.id
  const router = useRouter()
  const params = useParams()
  const orgSlug = params?.orgSlug as string

  const form = useForm<CreateAgentInput | EditAgentInput>({
    resolver: zodResolver(isEditing ? editAgentSchema : createAgentSchema),
    defaultValues: isEditing
      ? { name: defaultValues.name, isActive: defaultValues.isActive }
      : {
          name: '',
          isActive: true,
          promptConfig: {
            role: 'sdr',
            roleCustom: '',
            companyName: '',
            companyDescription: '',
            targetAudience: '',
            tone: 'professional',
            responseLength: 'medium',
            useEmojis: false,
            language: 'pt-BR',
            guidelines: [],
            restrictions: [],
          },
        },
  })

  const { execute: executeCreate, isPending: isCreating } = useAction(
    createAgent,
    {
      onSuccess: ({ data }) => {
        toast.success('Agente criado com sucesso!')
        if (data?.current && data?.limit && data.limit > 0) {
          const pct = data.current / data.limit
          if (pct >= 0.9) {
            toast.warning(
              `Você está usando ${data.current} de ${data.limit} agentes IA. Considere fazer upgrade.`,
              { duration: 6000 },
            )
          }
        }
        form.reset()
        setIsOpen(false)
        if (data?.agentId) {
          router.push(`/org/${orgSlug}/ai-agent/${data.agentId}`)
        }
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao criar agente.')
      },
    },
  )

  const onSubmit = (data: CreateAgentInput | EditAgentInput) => {
    if (isEditing && defaultValues?.id) {
      onUpdate?.({ id: defaultValues.id, name: data.name, isActive: data.isActive } as UpdateAgentInput)
    } else {
      executeCreate(data as CreateAgentInput)
    }
  }

  const handleCloseDialog = () => {
    form.reset()
    setIsOpen(false)
  }

  const isPending = isCreating || isUpdatingProp
  const createControl = form.control as Control<CreateAgentInput>

  return (
    <SheetContent className="overflow-y-auto sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>
          {isEditing ? 'Editar Agente' : 'Novo Agente'}
        </SheetTitle>
        <SheetDescription>
          {isEditing
            ? 'Atualize as informações básicas do agente. Para editar o prompt e demais configurações, acesse a página de detalhes.'
            : 'Configure o agente IA com todas as definições do prompt.'}
        </SheetDescription>
      </SheetHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome *</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Atendente WhatsApp" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {!isEditing && (
            <CreateAgentPromptFields control={createControl} />
          )}

          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border px-4 py-3">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="leading-none">
                  <FormLabel>Agente ativo</FormLabel>
                </div>
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  Salvar
                </div>
              ) : (
                'Salvar'
              )}
            </Button>
          </div>
        </form>
      </Form>
    </SheetContent>
  )
}

export default UpsertAgentSheetContent
