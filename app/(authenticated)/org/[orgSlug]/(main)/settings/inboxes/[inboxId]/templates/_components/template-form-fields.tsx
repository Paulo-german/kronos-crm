'use client'

import { useMemo } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Textarea } from '@/_components/ui/textarea'
import { Switch } from '@/_components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Badge } from '@/_components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/_components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/_components/ui/popover'
import { Button } from '@/_components/ui/button'
import { Check, ChevronsUpDown, Info, CheckCircle2, AlertTriangle } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { WHATSAPP_LANGUAGES } from '@/_lib/meta/constants'
import type { CreateWhatsAppTemplateInput } from '@/_actions/inbox/create-whatsapp-template/schema'

interface TemplateFormFieldsProps {
  form: UseFormReturn<CreateWhatsAppTemplateInput>
  isEditing?: boolean
}

/** Extrai variáveis {{N}} de um texto via regex (sem useEffect) */
function extractVariables(text: string): number[] {
  const matches = text.matchAll(/\{\{(\d+)\}\}/g)
  const indices = new Set<number>()
  for (const match of matches) {
    indices.add(parseInt(match[1], 10))
  }
  return Array.from(indices).sort((a, b) => a - b)
}

/** Formata número com separador de milhar: 1024 → "1.024" */
function formatCount(value: number): string {
  return value.toLocaleString('pt-BR')
}

export function TemplateFormFields({ form, isEditing = false }: TemplateFormFieldsProps) {
  const bodyText = form.watch('components.body.text') ?? ''
  const headerFormat = form.watch('components.header.format')
  const hasHeader = form.watch('components.header') !== undefined
  const hasFooter = form.watch('components.footer') !== undefined
  const nameValue = form.watch('name') ?? ''
  const watchedBodyExamples = form.watch('components.body.examples')

  // Derivação inline das variáveis — ZERO useEffect
  const bodyVariables = useMemo(() => extractVariables(bodyText), [bodyText])
  const headerText = form.watch('components.header.text') ?? ''
  const headerVariables = useMemo(() => extractVariables(headerText), [headerText])

  const charCount = bodyText.length
  const MAX_BODY = 1024

  // Validação visual inline do nome
  const isNameValid = nameValue.length > 0 && /^[a-z0-9_]+$/.test(nameValue)
  const isNameInvalid = nameValue.length > 0 && !/^[a-z0-9_]+$/.test(nameValue)

  // Validações inline do corpo (regras do Meta)
  const bodyWarnings = useMemo(() => {
    const warnings: string[] = []
    if (!bodyText.trim()) return warnings

    // Variável no início do texto
    if (/^\s*\{\{\d+\}\}/.test(bodyText)) {
      warnings.push('Variáveis não podem estar no início do texto.')
    }

    // Variável no final do texto
    if (/\{\{\d+\}\}\s*$/.test(bodyText)) {
      warnings.push('Variáveis não podem estar no final do texto.')
    }

    // Ratio variáveis/texto (heurística: texto fixo deve ter pelo menos 3x mais caracteres que variáveis)
    if (bodyVariables.length > 0) {
      const textWithoutVars = bodyText.replace(/\{\{\d+\}\}/g, '').trim()
      if (textWithoutVars.length < bodyVariables.length * 10) {
        warnings.push('Texto muito curto para a quantidade de variáveis. O Meta pode rejeitar.')
      }
    }

    return warnings
  }, [bodyText, bodyVariables])

  // Estado dos exemplos para o banner de variáveis
  const allExamplesFilled = useMemo(() => {
    if (bodyVariables.length === 0) return false
    const examples = watchedBodyExamples ?? []
    return bodyVariables.every((varIndex) => {
      const example = examples[varIndex - 1]
      return example && example.trim().length > 0
    })
  }, [bodyVariables, watchedBodyExamples])

  const toggleHeader = (enabled: boolean) => {
    if (enabled) {
      form.setValue('components.header', { format: 'TEXT', text: '' })
    } else {
      form.setValue('components.header', undefined)
    }
  }

  const toggleFooter = (enabled: boolean) => {
    if (enabled) {
      form.setValue('components.footer', { text: '' })
    } else {
      form.setValue('components.footer', undefined)
    }
  }

  return (
    <div className="space-y-5">
      {/* Nome */}
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <div className="flex items-center justify-between">
              <FormLabel>Nome do template</FormLabel>
              {isNameValid && (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Válido
                </span>
              )}
            </div>
            <FormControl>
              <div className="relative">
                <Input
                  {...field}
                  placeholder="meu_template_promocional"
                  disabled={isEditing}
                  className={cn(
                    isNameValid && 'border-emerald-500/50 focus-visible:ring-emerald-500/30',
                    isNameInvalid && 'border-destructive/50 focus-visible:ring-destructive/30',
                  )}
                />
              </div>
            </FormControl>
            <FormDescription className="flex items-center gap-1.5">
              <span className="text-[11px] tracking-tight text-muted-foreground/70">
                a-z, 0-9 e _ apenas
              </span>
              <span className="text-muted-foreground/40">·</span>
              <span>ex: ordem_confirmada</span>
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        {/* Categoria */}
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isEditing}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utilidade</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Idioma */}
        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Idioma</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        'w-full justify-between border-border bg-input hover:bg-input/80',
                        !field.value && 'text-muted-foreground',
                      )}
                      disabled={isEditing}
                    >
                      {field.value
                        ? (WHATSAPP_LANGUAGES.find((lang) => lang.value === field.value)?.label ?? field.value)
                        : 'Selecionar...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[280px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar idioma..." />
                    <CommandList>
                      <CommandEmpty>Idioma não encontrado.</CommandEmpty>
                      <CommandGroup>
                        {WHATSAPP_LANGUAGES.map((lang) => (
                          <CommandItem
                            key={lang.value}
                            value={lang.label}
                            onSelect={() => {
                              form.setValue('language', lang.value)
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                field.value === lang.value ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            <span className="flex-1">{lang.label}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {lang.value}
                            </Badge>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Cabeçalho (opcional) */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Cabeçalho</p>
            <Badge
              variant="outline"
              className="border-border/40 text-[10px] font-normal text-muted-foreground"
            >
              Opcional
            </Badge>
          </div>
          <Switch checked={hasHeader} onCheckedChange={toggleHeader} />
        </div>

        {hasHeader && (
          <div className="space-y-3 pt-1">
            <FormField
              control={form.control}
              name="components.header.format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formato</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="TEXT">Texto</SelectItem>
                      <SelectItem value="IMAGE">Imagem</SelectItem>
                      <SelectItem value="VIDEO">Vídeo</SelectItem>
                      <SelectItem value="DOCUMENT">Documento</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {headerFormat === 'TEXT' && (
              <FormField
                control={form.control}
                name="components.header.text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Texto do cabeçalho</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="Ex: Pedido {{1}} confirmado"
                        maxLength={60}
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo 60 caracteres. Use {`{{1}}`} para variáveis.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {headerFormat === 'TEXT' && headerVariables.length > 0 && (
              <div className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2">
                <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  Variáveis no cabeçalho serão substituídas durante o envio.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Corpo (obrigatório) */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-4">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium">Corpo</p>
          <Badge className="border-0 bg-amber-500/15 text-[10px] font-normal text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
            Obrigatório
          </Badge>
        </div>

        <FormField
          control={form.control}
          name="components.body.text"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Texto do corpo</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Olá {{1}}, seu pedido {{2}} foi confirmado!"
                  className="min-h-[100px] resize-none"
                  maxLength={MAX_BODY}
                />
              </FormControl>
              <div className="flex items-start justify-between gap-2">
                <FormDescription>
                  Use {`{{1}}`}, {`{{2}}`}... para inserir variáveis dinâmicas
                </FormDescription>
                <span
                  className={cn(
                    'shrink-0 text-xs tabular-nums',
                    charCount >= MAX_BODY
                      ? 'font-medium text-destructive'
                      : charCount > MAX_BODY * 0.9
                        ? 'font-medium text-amber-600'
                        : 'text-muted-foreground',
                  )}
                >
                  {formatCount(charCount)} / {formatCount(MAX_BODY)}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Banner de variáveis detectadas */}
        {bodyVariables.length > 0 && (
          <div
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-xs',
              allExamplesFilled
                ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400'
                : 'bg-amber-500/10 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
            )}
          >
            {allExamplesFilled ? (
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            )}
            <span>
              {bodyVariables.length}{' '}
              {bodyVariables.length === 1 ? 'variável detectada' : 'variáveis detectadas'}
              {allExamplesFilled
                ? ' — Exemplos completos'
                : ' — Preencha os exemplos para aprovação'}
            </span>
          </div>
        )}

        {/* Avisos de validação do Meta */}
        {bodyWarnings.length > 0 && (
          <div className="space-y-1.5">
            {bodyWarnings.map((warning) => (
              <div
                key={warning}
                className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive dark:bg-destructive/15"
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        )}

        {/* Exemplos para variáveis do body */}
        {bodyVariables.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Exemplos de valores (obrigatório para aprovação):
            </p>
            {bodyVariables.map((varIndex) => (
              <FormField
                key={`body-var-${varIndex}`}
                control={form.control}
                name={`components.body.examples.${varIndex - 1}` as `components.body.examples.${number}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-muted-foreground">{`{{${varIndex}}}`}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder={`Exemplo para {{${varIndex}}}`}
                        className="h-8 text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rodapé (opcional) */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">Rodapé</p>
            <Badge
              variant="outline"
              className="border-border/40 text-[10px] font-normal text-muted-foreground"
            >
              Opcional
            </Badge>
          </div>
          <Switch checked={hasFooter} onCheckedChange={toggleFooter} />
        </div>

        {hasFooter && (
          <FormField
            control={form.control}
            name="components.footer.text"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Texto do rodapé</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="Ex: Obrigado por comprar conosco"
                    maxLength={60}
                  />
                </FormControl>
                <FormDescription>Máximo 60 caracteres.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  )
}
