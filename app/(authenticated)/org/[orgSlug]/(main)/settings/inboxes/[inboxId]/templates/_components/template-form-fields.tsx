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
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/_components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/_components/ui/popover'
import { Button } from '@/_components/ui/button'
import { Check, ChevronsUpDown } from 'lucide-react'
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

export function TemplateFormFields({ form, isEditing = false }: TemplateFormFieldsProps) {
  const bodyText = form.watch('components.body.text') ?? ''
  const headerFormat = form.watch('components.header.format')
  const hasHeader = form.watch('components.header') !== undefined
  const hasFooter = form.watch('components.footer') !== undefined

  // Derivação inline das variáveis do body — ZERO useEffect
  const bodyVariables = useMemo(() => extractVariables(bodyText), [bodyText])
  const headerText = form.watch('components.header.text') ?? ''
  const headerVariables = useMemo(() => extractVariables(headerText), [headerText])

  const charCount = bodyText.length
  const MAX_BODY = 1024

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
            <FormLabel>Nome do template</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="meu_template_promocional"
                disabled={isEditing}
              />
            </FormControl>
            <FormDescription>
              Somente letras minúsculas, números e underscore (ex: ordem_confirmada)
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
                        'w-full justify-between',
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
                            <Badge variant="outline" className="ml-2 font-mono text-xs">
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

      {/* Header (opcional) */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Cabeçalho</p>
            <p className="text-xs text-muted-foreground">Opcional — aparece acima do corpo</p>
          </div>
          <Switch
            checked={hasHeader}
            onCheckedChange={toggleHeader}
          />
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

            {/* Nota sobre variáveis no header TEXT */}
            {headerFormat === 'TEXT' && headerVariables.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Variáveis no cabeçalho serão substituídas durante o envio.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Body (obrigatório) */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-4">
        <div>
          <p className="text-sm font-medium">Corpo</p>
          <p className="text-xs text-muted-foreground">
            Obrigatório — texto principal da mensagem
          </p>
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
              <div className="flex items-center justify-between">
                <FormDescription>
                  Use {`{{1}}`}, {`{{2}}`}... para inserir variáveis dinâmicas
                </FormDescription>
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    charCount > MAX_BODY * 0.9
                      ? charCount >= MAX_BODY
                        ? 'text-destructive'
                        : 'text-amber-600'
                      : 'text-muted-foreground',
                  )}
                >
                  {charCount}/{MAX_BODY}
                </span>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Exemplos para variáveis do body — derivados inline via useMemo */}
        {bodyVariables.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Exemplos para variáveis (obrigatório para aprovação):
            </p>
            {bodyVariables.map((varIndex) => (
              <FormField
                key={`body-var-${varIndex}`}
                control={form.control}
                name={`components.body.examples.${varIndex - 1}` as `components.body.examples.${number}`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">{`{{${varIndex}}}`}</FormLabel>
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

      {/* Footer (opcional) */}
      <div className="space-y-3 rounded-lg border border-border/50 bg-secondary/10 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Rodapé</p>
            <p className="text-xs text-muted-foreground">Opcional — aparece abaixo do corpo</p>
          </div>
          <Switch
            checked={hasFooter}
            onCheckedChange={toggleFooter}
          />
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
