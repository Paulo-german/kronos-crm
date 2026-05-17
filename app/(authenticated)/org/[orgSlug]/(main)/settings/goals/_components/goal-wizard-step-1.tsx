'use client'

import { useState } from 'react'
import { useFormContext } from 'react-hook-form'
import type { GoalType, GoalScope, GoalPeriod } from '@prisma/client'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { RadioGroup, RadioGroupItem } from '@/_components/ui/radio-group'
import { Label } from '@/_components/ui/label'
import { Button } from '@/_components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/_components/ui/popover'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { PeriodWindowHint } from './period-window-hint'
import type { CreateGoalFormValues } from './goal-form-types'
import type { OrgPipelineDto } from '@/_data-access/pipeline/get-org-pipelines'
import type { AcceptedMemberDto } from '@/_data-access/organization/get-organization-members'

const GOAL_TYPE_LABELS: Record<GoalType, string> = {
  REVENUE: 'Receita',
  DEALS_CLOSED: 'Negócios fechados',
  DEALS_OPENED: 'Negócios abertos',
  ACTIVITIES: 'Atividades',
  CONVERSATIONS: 'Conversas',
}

const GOAL_SCOPE_LABELS: Record<GoalScope, string> = {
  ORG: 'Organização',
  PIPELINE: 'Funil',
  MEMBER: 'Vendedor',
}

const GOAL_PERIOD_LABELS: Record<GoalPeriod, string> = {
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  YEARLY: 'Anual',
}

interface GoalWizardStep1Props {
  pipelines: OrgPipelineDto[]
  members: AcceptedMemberDto[]
}

export function GoalWizardStep1({ pipelines, members }: GoalWizardStep1Props) {
  const form = useFormContext<CreateGoalFormValues>()
  const [pipelineOpen, setPipelineOpen] = useState(false)
  const [memberOpen, setMemberOpen] = useState(false)

  const watchedScope = form.watch('scope')
  const watchedPeriod = form.watch('period')
  const watchedPipelineId = form.watch('targetPipelineId')
  const watchedUserId = form.watch('targetUserId')

  const selectedPipeline = pipelines.find(
    (pipeline) => pipeline.id === watchedPipelineId,
  )
  const selectedMember = members.find(
    (member) => member.userId === watchedUserId,
  )

  return (
    <div className="space-y-6">
      {/* Tipo da meta */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Tipo de meta</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-1 gap-2"
              >
                {(
                  Object.entries(GOAL_TYPE_LABELS) as [GoalType, string][]
                ).map(([value, label]) => (
                  <div
                    key={value}
                    className={cn(
                      'flex items-center space-x-3 rounded-md border px-4 py-3 transition-colors',
                      field.value === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    <RadioGroupItem value={value} id={`type-${value}`} />
                    <Label
                      htmlFor={`type-${value}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Escopo */}
      <FormField
        control={form.control}
        name="scope"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Escopo</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => {
                  field.onChange(value)
                  // Limpa os campos dependentes ao mudar escopo
                  form.setValue('targetPipelineId', null)
                  form.setValue('targetUserId', null)
                }}
                value={field.value}
                className="grid grid-cols-3 gap-2"
              >
                {(
                  Object.entries(GOAL_SCOPE_LABELS) as [GoalScope, string][]
                ).map(([value, label]) => (
                  <div
                    key={value}
                    className={cn(
                      'flex items-center space-x-2 rounded-md border px-3 py-2.5 transition-colors',
                      field.value === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    <RadioGroupItem value={value} id={`scope-${value}`} />
                    <Label
                      htmlFor={`scope-${value}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Combobox de pipeline (condicional) */}
      {watchedScope === 'PIPELINE' && (
        <FormField
          control={form.control}
          name="targetPipelineId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Funil</FormLabel>
              <FormControl>
                <Popover open={pipelineOpen} onOpenChange={setPipelineOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={pipelineOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedPipeline?.name ?? 'Selecionar funil...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar funil..." />
                      <CommandList>
                        <CommandEmpty>Nenhum funil encontrado.</CommandEmpty>
                        <CommandGroup>
                          {pipelines.map((pipeline) => (
                            <CommandItem
                              key={pipeline.id}
                              value={pipeline.name}
                              onSelect={() => {
                                field.onChange(pipeline.id)
                                setPipelineOpen(false)
                              }}
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-4 w-4',
                                  field.value === pipeline.id
                                    ? 'opacity-100'
                                    : 'opacity-0',
                                )}
                              />
                              {pipeline.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Combobox de membro (condicional) */}
      {watchedScope === 'MEMBER' && (
        <FormField
          control={form.control}
          name="targetUserId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Vendedor</FormLabel>
              <FormControl>
                <Popover open={memberOpen} onOpenChange={setMemberOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={memberOpen}
                      className="w-full justify-between font-normal"
                    >
                      {selectedMember?.user?.fullName ??
                        selectedMember?.email ??
                        'Selecionar vendedor...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar vendedor..." />
                      <CommandList>
                        <CommandEmpty>
                          Nenhum vendedor encontrado.
                        </CommandEmpty>
                        <CommandGroup>
                          {members
                            .filter(
                              (member) =>
                                member.userId && member.status === 'ACCEPTED',
                            )
                            .map((member) => (
                              <CommandItem
                                key={member.id}
                                value={
                                  member.user?.fullName ?? member.email ?? ''
                                }
                                onSelect={() => {
                                  field.onChange(member.userId)
                                  setMemberOpen(false)
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    field.value === member.userId
                                      ? 'opacity-100'
                                      : 'opacity-0',
                                  )}
                                />
                                {member.user?.fullName ?? member.email}
                              </CommandItem>
                            ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Período */}
      <FormField
        control={form.control}
        name="period"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <FormLabel>Período</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="grid grid-cols-2 gap-2"
              >
                {(
                  Object.entries(GOAL_PERIOD_LABELS) as [GoalPeriod, string][]
                ).map(([value, label]) => (
                  <div
                    key={value}
                    className={cn(
                      'flex items-center space-x-2 rounded-md border px-3 py-2.5 transition-colors',
                      field.value === value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-border/80',
                    )}
                  >
                    <RadioGroupItem value={value} id={`period-${value}`} />
                    <Label
                      htmlFor={`period-${value}`}
                      className="cursor-pointer text-sm font-medium"
                    >
                      {label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Hint de janela do período */}
      {watchedPeriod && <PeriodWindowHint period={watchedPeriod} />}
    </div>
  )
}
