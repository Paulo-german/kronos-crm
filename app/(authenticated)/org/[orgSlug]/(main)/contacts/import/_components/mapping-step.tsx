'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react'
import type { ImportRow } from '@/_actions/contact/import-contacts/schema'

const FIELD_OPTIONS = [
  { value: '__ignore__', label: '(Ignorar)' },
  { value: 'name', label: 'Nome' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Telefone' },
  { value: 'companyName', label: 'Empresa' },
  { value: 'role', label: 'Cargo' },
  { value: 'cpf', label: 'CPF' },
  { value: 'isDecisionMaker', label: 'Decisor' },
] as const

type FieldValue = (typeof FIELD_OPTIONS)[number]['value']

const AUTO_DETECT_PATTERNS: Record<string, FieldValue> = {
  nome: 'name',
  name: 'name',
  'nome completo': 'name',
  'full name': 'name',
  email: 'email',
  'e-mail': 'email',
  'e mail': 'email',
  telefone: 'phone',
  phone: 'phone',
  celular: 'phone',
  whatsapp: 'phone',
  tel: 'phone',
  empresa: 'companyName',
  company: 'companyName',
  'empresa/organização': 'companyName',
  'empresa/organizacao': 'companyName',
  cargo: 'role',
  role: 'role',
  função: 'role',
  funcao: 'role',
  position: 'role',
  cpf: 'cpf',
  documento: 'cpf',
  document: 'cpf',
  decisor: 'isDecisionMaker',
  'decision maker': 'isDecisionMaker',
  decisão: 'isDecisionMaker',
  decisao: 'isDecisionMaker',
}

function autoDetectMapping(headers: string[]): Record<number, FieldValue> {
  const mapping: Record<number, FieldValue> = {}
  const usedFields = new Set<FieldValue>()

  for (let index = 0; index < headers.length; index++) {
    const normalized = headers[index].toLowerCase().trim()
    const detectedField = AUTO_DETECT_PATTERNS[normalized]

    if (detectedField && !usedFields.has(detectedField)) {
      mapping[index] = detectedField
      usedFields.add(detectedField)
    } else {
      mapping[index] = '__ignore__'
    }
  }

  return mapping
}

const TRUTHY_VALUES = new Set(['sim', 'yes', 'true', '1', 'x', 'verdadeiro'])

interface MappingStepProps {
  headers: string[]
  rows: string[][]
  onMapped: (mappedRows: ImportRow[]) => void
  onBack: () => void
}

export function MappingStep({ headers, rows, onMapped, onBack }: MappingStepProps) {
  const [mapping, setMapping] = useState<Record<number, FieldValue>>(() =>
    autoDetectMapping(headers),
  )

  const isNameMapped = useMemo(
    () => Object.values(mapping).includes('name'),
    [mapping],
  )

  const handleMappingChange = (columnIndex: number, value: FieldValue) => {
    setMapping((prev) => {
      const updated = { ...prev }

      // Se o campo já está mapeado em outra coluna, limpar
      if (value !== '__ignore__') {
        for (const key of Object.keys(updated)) {
          if (updated[Number(key)] === value) {
            updated[Number(key)] = '__ignore__'
          }
        }
      }

      updated[columnIndex] = value
      return updated
    })
  }

  const handleConfirm = () => {
    const mappedRows: ImportRow[] = rows.map((row) => {
      const mapped: Record<string, string | boolean> = {}

      for (const [colIndexStr, field] of Object.entries(mapping)) {
        if (field === '__ignore__') continue

        const colIndex = Number(colIndexStr)
        const value = row[colIndex] ?? ''

        if (field === 'isDecisionMaker') {
          mapped[field] = TRUTHY_VALUES.has(value.toLowerCase().trim())
        } else {
          mapped[field] = value
        }
      }

      // Garantir defaults
      if (!mapped.name) mapped.name = ''
      if (mapped.isDecisionMaker === undefined) mapped.isDecisionMaker = false

      return mapped as unknown as ImportRow
    })

    onMapped(mappedRows)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Mapeamento de Colunas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Associe cada coluna do arquivo a um campo do contato. Colunas
          detectadas automaticamente já estão mapeadas.
        </p>

        <div className="space-y-3">
          {headers.map((header, index) => (
            <div
              key={index}
              className="flex items-center gap-4"
            >
              <span className="w-48 truncate text-sm font-medium" title={header}>
                {header}
              </span>
              <Select
                value={mapping[index] ?? '__ignore__'}
                onValueChange={(value) =>
                  handleMappingChange(index, value as FieldValue)
                }
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FIELD_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {!isNameMapped && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              O campo &quot;Nome&quot; é obrigatório. Mapeie uma coluna para ele.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button onClick={handleConfirm} disabled={!isNameMapped}>
            Continuar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
