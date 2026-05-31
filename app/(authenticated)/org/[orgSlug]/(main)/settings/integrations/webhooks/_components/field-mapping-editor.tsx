'use client'

import { useState, useEffect, useRef, useId } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  FIELD_MAPPING_KEY_LABELS,
  type FieldMappingKey,
} from '../_lib/platform-templates'

interface FieldPair {
  uid: string
  key: string
  path: string
}

interface FieldMappingEditorProps {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
}

const ALL_KEYS: FieldMappingKey[] = [
  'name',
  'email',
  'phone',
  'companyName',
  'dealTitle',
  'dealValue',
  'dealNotes',
  'dealStageId',
]

function nextUid() {
  return crypto.randomUUID()
}

function recordToPairs(record: Record<string, string>): FieldPair[] {
  return Object.entries(record).map(([key, path]) => ({ uid: nextUid(), key, path }))
}

function pairsToRecord(pairs: FieldPair[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (const pair of pairs) {
    if (pair.key && pair.path) {
      result[pair.key] = pair.path
    }
  }
  return result
}

export function FieldMappingEditor({ value, onChange }: FieldMappingEditorProps) {
  const baseId = useId()
  const [pairs, setPairs] = useState<FieldPair[]>(() => recordToPairs(value))

  // Ref sempre atualizado com os pares atuais — permite comparação no efeito sem adicioná-lo às deps
  const pairsRef = useRef(pairs)
  pairsRef.current = pairs

  // Sincroniza apenas quando o conteúdo do value externo realmente mudou (ex: template aplicado).
  // Comparar serializado evita reset falso quando o RHF cria nova referência {} com mesmo conteúdo.
  useEffect(() => {
    const incoming = JSON.stringify(value ?? {})
    const current = JSON.stringify(pairsToRecord(pairsRef.current))
    if (incoming !== current) {
      setPairs(recordToPairs(value))
    }
  }, [value])

  const handleKeyChange = (uid: string, newKey: string) => {
    const updated = pairs.map((pair) =>
      pair.uid === uid ? { ...pair, key: newKey } : pair,
    )
    setPairs(updated)
    onChange(pairsToRecord(updated))
  }

  const handlePathChange = (uid: string, newPath: string) => {
    const updated = pairs.map((pair) =>
      pair.uid === uid ? { ...pair, path: newPath } : pair,
    )
    setPairs(updated)
    onChange(pairsToRecord(updated))
  }

  const handleRemove = (uid: string) => {
    const updated = pairs.filter((pair) => pair.uid !== uid)
    setPairs(updated)
    onChange(pairsToRecord(updated))
  }

  const handleAdd = () => {
    const usedKeys = new Set(pairs.map((pair) => pair.key))
    const nextKey = ALL_KEYS.find((key) => !usedKeys.has(key)) ?? ''
    const updated = [...pairs, { uid: nextUid(), key: nextKey, path: '' }]
    setPairs(updated)
  }

  return (
    <div className="space-y-2">
      {pairs.map((pair) => (
        <div key={`${baseId}-${pair.uid}`} className="flex items-center gap-2">
          <Select
            value={pair.key}
            onValueChange={(newKey) => handleKeyChange(pair.uid, newKey)}
          >
            <SelectTrigger className="w-44 shrink-0">
              <SelectValue placeholder="Campo CRM" />
            </SelectTrigger>
            <SelectContent>
              {ALL_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {FIELD_MAPPING_KEY_LABELS[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="ex: cliente.email"
            value={pair.path}
            onChange={(event) => handlePathChange(pair.uid, event.target.value)}
            className="text-xs"
          />

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => handleRemove(pair.uid)}
            aria-label="Remover campo"
            className="shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="gap-1.5"
        disabled={pairs.length >= ALL_KEYS.length}
      >
        <Plus className="h-4 w-4" />
        Adicionar campo
      </Button>
    </div>
  )
}
