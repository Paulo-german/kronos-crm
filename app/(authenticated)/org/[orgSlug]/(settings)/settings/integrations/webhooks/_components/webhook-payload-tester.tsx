'use client'

import { useState, useEffect } from 'react'
import { Play, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Textarea } from '@/_components/ui/textarea'
import { Badge } from '@/_components/ui/badge'
import { resolveFieldMapping } from '@/_lib/webhooks/resolve-field-mapping'

interface WebhookPayloadTesterProps {
  fieldMapping: Record<string, string>
}

const PLACEHOLDER_JSON = JSON.stringify(
  {
    customer: {
      email: 'joao@exemplo.com',
      first_name: 'João',
      phone: '+55119999-9999',
    },
  },
  null,
  2,
)

interface ResolvedEntry {
  key: string
  path: string
  value: unknown
  found: boolean
}

export function WebhookPayloadTester({ fieldMapping }: WebhookPayloadTesterProps) {
  const [rawJson, setRawJson] = useState(PLACEHOLDER_JSON)
  const [entries, setEntries] = useState<ResolvedEntry[] | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)

  // Descarta resultado stale quando o mapeamento muda
  useEffect(() => {
    setEntries(null)
    setParseError(null)
  }, [fieldMapping])

  const handleTest = () => {
    setParseError(null)
    setEntries(null)

    let parsed: unknown
    try {
      parsed = JSON.parse(rawJson)
    } catch {
      setParseError('JSON inválido. Verifique a sintaxe.')
      return
    }

    const resolved = resolveFieldMapping(fieldMapping, parsed)

    const result: ResolvedEntry[] = Object.entries(fieldMapping).map(([key, path]) => {
      const value = resolved[key]
      return { key, path, value, found: value !== undefined && value !== null }
    })

    setEntries(result)
  }

  const foundCount = entries?.filter((e) => e.found).length ?? 0
  const totalCount = entries?.length ?? 0

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Cole um exemplo de dados para verificar se as configurações estão corretas.
      </p>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">
            Dados de exemplo
          </label>
          <Textarea
            value={rawJson}
            onChange={(event) => {
              setRawJson(event.target.value)
              setEntries(null)
              setParseError(null)
            }}
            className="h-40 font-mono text-xs"
            placeholder="Cole aqui o JSON do webhook..."
            spellCheck={false}
          />
          {parseError && (
            <p className="text-xs text-destructive">{parseError}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-muted-foreground">
              Resultado
            </label>
            {entries !== null && (
              <span className="text-xs text-muted-foreground">
                {foundCount}/{totalCount} encontrados
              </span>
            )}
          </div>

          <div className="h-40 overflow-auto rounded-md border bg-muted p-3">
            {entries === null ? (
              <p className="text-xs text-muted-foreground">
                ← Clique em &quot;Testar&quot; para ver o resultado
              </p>
            ) : entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum campo configurado.</p>
            ) : (
              <div className="space-y-1.5">
                {entries.map((entry) => (
                  <div key={entry.key} className="flex items-start gap-2 text-xs">
                    {entry.found ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                    )}
                    <div className="min-w-0">
                      <span className="font-medium">{entry.key}</span>
                      <span className="text-muted-foreground"> ← {entry.path}</span>
                      <div className="mt-0.5">
                        {entry.found ? (
                          <Badge variant="secondary" className="font-mono text-xs h-auto py-0">
                            {String(entry.value)}
                          </Badge>
                        ) : (
                          <span className="text-destructive">não encontrado</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleTest}
        className="gap-1.5"
      >
        <Play className="h-3.5 w-3.5" />
        Testar
      </Button>
    </div>
  )
}
