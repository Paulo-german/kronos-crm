'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Control, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { BotIcon, UsersIcon, Loader2, SparklesIcon } from 'lucide-react'
import { Alert, AlertDescription } from '@/_components/ui/alert'
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
import { Card, CardContent } from '@/_components/ui/card'
import { Badge } from '@/_components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'
import { Input } from '@/_components/ui/input'
import { Label } from '@/_components/ui/label'
import { Textarea } from '@/_components/ui/textarea'
import { Button } from '@/_components/ui/button'
import { Switch } from '@/_components/ui/switch'
import { Separator } from '@/_components/ui/separator'
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
import {
  composeAgentVersion,
  decomposeAgentVersion,
  type AgentVersionFormState,
} from '../_lib/agent-version-ui'
import { z } from 'zod'

const editAgentSchema = z.object({
  name: z.string().min(1, 'Nome não pode ser vazio'),
  isActive: z.boolean(),
})

type EditAgentInput = z.infer<typeof editAgentSchema>

// ---------------------------------------------------------------------------
// Subcomponente: campos de prompt (apenas no create flow)
// ---------------------------------------------------------------------------

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
    </>
  )
}

// ---------------------------------------------------------------------------
// Subcomponente: seletor de versão (só aparece quando agentType === 'single')
// ---------------------------------------------------------------------------

interface AgentVersionSelectorProps {
  singleVersion: AgentVersionFormState['singleVersion']
  onVersionChange: (version: AgentVersionFormState['singleVersion']) => void
  singleV2OverhaulEnabled: boolean
  isSuperAdmin: boolean
}

const AgentVersionSelector = ({
  singleVersion,
  onVersionChange,
  singleV2OverhaulEnabled,
  isSuperAdmin,
}: AgentVersionSelectorProps) => {
  // v2 só é visível para superadmins durante o rollout controlado.
  if (!isSuperAdmin) return null

  const isV2Selected = singleVersion === 'single-v2'

  return (
    <div className="space-y-2">
      <Label>Versão</Label>
      <Select value={singleVersion} onValueChange={onVersionChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="single-v1">Padrão</SelectItem>
          <SelectItem value="single-v2">
            <div className="flex items-center gap-2">
              <span>Avançado</span>
              <Badge
                variant="secondary"
                className="border-yellow-500/30 bg-yellow-500/10 text-[10px] text-yellow-600 dark:text-yellow-400"
              >
                Beta
              </Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {isV2Selected && (
        <Alert className="border-primary/30 bg-primary/5">
          <SparklesIcon className="h-4 w-4 text-primary" />
          <AlertDescription className="space-y-1.5 text-xs">
            <p className="font-medium text-foreground">
              {singleV2OverhaulEnabled
                ? 'O que muda na versão Avançada'
                : 'Em desenvolvimento — ainda não disponível em produção'}
            </p>
            <ul className="list-disc space-y-0.5 pl-4 text-muted-foreground">
              <li>Bloqueia respostas com preço inventado pela IA</li>
              <li>Envia imagens de produtos automaticamente na conversa</li>
              <li>Resposta de segurança se a IA falhar, sem travar o atendimento</li>
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subcomponente: seletor de tipo de agente (Cards clicáveis)
// ---------------------------------------------------------------------------

interface AgentTypeSelectorProps {
  agentType: AgentVersionFormState['agentType']
  onTypeChange: (type: AgentVersionFormState['agentType']) => void
  singleVersion: AgentVersionFormState['singleVersion']
  onVersionChange: (version: AgentVersionFormState['singleVersion']) => void
  singleV2OverhaulEnabled: boolean
  isSuperAdmin: boolean
}

const AgentTypeSelector = ({
  agentType,
  onTypeChange,
  singleVersion,
  onVersionChange,
  singleV2OverhaulEnabled,
  isSuperAdmin,
}: AgentTypeSelectorProps) => {
  const isSingleSelected = agentType === 'single'
  const isCrewSelected = agentType === 'crew'

  return (
    <div className="space-y-3">
      <Label>Arquitetura do agente</Label>

      <div className="grid grid-cols-2 gap-3">
        {/* Card Single — habilitado */}
        <button
          type="button"
          onClick={() => onTypeChange('single')}
          aria-pressed={isSingleSelected}
          className="text-left"
        >
          <Card
            className={
              isSingleSelected
                ? 'border-primary ring-2 ring-primary/20 transition-colors'
                : 'border-border/50 transition-colors hover:border-primary/40'
            }
          >
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <BotIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Single</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Agente único, fluxo linear
              </p>
            </CardContent>
          </Card>
        </button>

        {/* Card Crew — disabled, com Badge "Em breve" e Tooltip explicativo.
            Crew não está público ainda — GA previsto na próxima release. */}
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            {/* span necessário para Tooltip funcionar com elemento disabled */}
            <span className="block">
              <Card
                className={
                  isCrewSelected
                    ? 'cursor-not-allowed border-primary opacity-60 ring-2 ring-primary/20'
                    : 'cursor-not-allowed border-border/50 opacity-60'
                }
                aria-disabled="true"
              >
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UsersIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Crew</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      Em breve
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Múltiplos agentes orquestrados
                  </p>
                </CardContent>
              </Card>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] text-center">
            Estamos finalizando o fluxo de criação de crews. Fique de olho.
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Select de versão — só aparece quando tipo é 'single' e usuário é superadmin */}
      {agentType !== 'single' ? null : (
        <AgentVersionSelector
          singleVersion={singleVersion}
          onVersionChange={onVersionChange}
          singleV2OverhaulEnabled={singleV2OverhaulEnabled}
          isSuperAdmin={isSuperAdmin}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface UpsertAgentSheetContentProps {
  defaultValues?: {
    id: string
    name: string
    isActive: boolean
    agentVersion?: 'single-v1' | 'single-v2' | 'crew-v1'
  }
  setIsOpen: Dispatch<SetStateAction<boolean>>
  onUpdate?: (data: UpdateAgentInput) => void
  isUpdating?: boolean
  singleV2OverhaulEnabled: boolean
  isSuperAdmin: boolean
}

const UpsertAgentSheetContent = ({
  defaultValues,
  setIsOpen,
  onUpdate,
  isUpdating: isUpdatingProp = false,
  singleV2OverhaulEnabled,
  isSuperAdmin,
}: UpsertAgentSheetContentProps) => {
  const isEditing = !!defaultValues?.id
  const router = useRouter()
  const params = useParams()
  const orgSlug = params?.orgSlug as string

  // Estado visual de tipo/versão fora do useForm — os campos agentType e
  // singleVersion não fazem parte do schema Zod persistido.
  // Derivar diretamente dos defaultValues no render: sem useEffect.
  const initialVersionState = decomposeAgentVersion(defaultValues?.agentVersion)
  const [agentType, setAgentType] = useState<AgentVersionFormState['agentType']>(
    initialVersionState.agentType,
  )
  const [singleVersion, setSingleVersion] = useState<
    AgentVersionFormState['singleVersion']
  >(initialVersionState.singleVersion)

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
      onUpdate?.({
        id: defaultValues.id,
        name: data.name,
        isActive: data.isActive,
      } as UpdateAgentInput)
      return
    }

    // Injetar agentVersion composto a partir dos estados visuais locais
    executeCreate({
      ...(data as CreateAgentInput),
      agentVersion: composeAgentVersion({ agentType, singleVersion }),
    })
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
            <>
              <CreateAgentPromptFields control={createControl} />

              <Separator />

              {/* Seletor de arquitetura + versão — apenas no create flow */}
              <AgentTypeSelector
                agentType={agentType}
                onTypeChange={setAgentType}
                singleVersion={singleVersion}
                onVersionChange={setSingleVersion}
                singleV2OverhaulEnabled={singleV2OverhaulEnabled}
                isSuperAdmin={isSuperAdmin}
              />
            </>
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
