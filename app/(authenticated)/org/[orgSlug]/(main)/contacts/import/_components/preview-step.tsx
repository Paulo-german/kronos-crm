'use client'

import { useMemo } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { z } from 'zod'
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Building2,
  Users,
} from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/_components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { Badge } from '@/_components/ui/badge'
import { Alert, AlertDescription } from '@/_components/ui/alert'
import { importContacts } from '@/_actions/contact/import-contacts'
import type { ImportRow } from '@/_actions/contact/import-contacts/schema'
import type { CompanyDto } from '@/_data-access/company/get-companies'

const rowSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  phone: z.string().optional(),
  role: z.string().optional(),
  cpf: z.string().optional(),
  companyName: z.string().optional(),
  isDecisionMaker: z.boolean().default(false),
})

interface ValidationResult {
  valid: boolean
  errors: string[]
}

function validateRow(row: ImportRow): ValidationResult {
  const result = rowSchema.safeParse(row)
  if (result.success) {
    return { valid: true, errors: [] }
  }
  return {
    valid: false,
    errors: result.error.issues.map((issue) => issue.message),
  }
}

interface PreviewStepProps {
  mappedRows: ImportRow[]
  companies: CompanyDto[]
  quotaCurrent: number
  quotaLimit: number
  onBack: () => void
}

export function PreviewStep({
  mappedRows,
  companies,
  quotaCurrent,
  quotaLimit,
  onBack,
}: PreviewStepProps) {
  const router = useRouter()
  const { orgSlug } = useParams<{ orgSlug: string }>()

  const { execute, isPending } = useAction(importContacts, {
    onSuccess: ({ data }) => {
      toast.success(
        `${data?.count} contato(s) importado(s) com sucesso!` +
          (data?.companiesCreated
            ? ` ${data.companiesCreated} empresa(s) criada(s).`
            : ''),
      )
      router.push(`/org/${orgSlug}/contacts`)
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao importar contatos.')
    },
  })

  const validationResults = useMemo(
    () => mappedRows.map((row) => validateRow(row)),
    [mappedRows],
  )

  const allValid = validationResults.every((result) => result.valid)
  const invalidCount = validationResults.filter((result) => !result.valid).length

  const existingCompanyNames = useMemo(
    () => new Set(companies.map((company) => company.name.toLowerCase().trim())),
    [companies],
  )

  const newCompanyNames = useMemo(() => {
    const names = new Set<string>()
    for (const row of mappedRows) {
      if (!row.companyName) continue
      const normalized = row.companyName.toLowerCase().trim()
      if (normalized && !existingCompanyNames.has(normalized)) {
        names.add(row.companyName.trim())
      }
    }
    return names
  }, [mappedRows, existingCompanyNames])

  const quotaExceeded = quotaCurrent + mappedRows.length > quotaLimit

  const handleImport = () => {
    execute({ rows: mappedRows })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Confirmar Importação</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Resumo */}
        <div className="flex flex-wrap gap-3">
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {mappedRows.length} contato(s)
          </Badge>
          {newCompanyNames.size > 0 && (
            <Badge variant="secondary" className="gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              {newCompanyNames.size} empresa(s) nova(s)
            </Badge>
          )}
          <Badge
            variant={quotaExceeded ? 'destructive' : 'secondary'}
            className="gap-1.5"
          >
            Quota: {quotaCurrent + mappedRows.length}/{quotaLimit}
          </Badge>
        </div>

        {quotaExceeded && (
          <Alert variant="destructive">
            <AlertDescription>
              Quota insuficiente: você tem {quotaCurrent}/{quotaLimit} contatos
              e está tentando importar {mappedRows.length}. Reduza o número de
              linhas ou faça upgrade do plano.
            </AlertDescription>
          </Alert>
        )}

        {invalidCount > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              {invalidCount} linha(s) com erros. Corrija o arquivo e tente
              novamente. Nenhum contato será importado enquanto houver erros.
            </AlertDescription>
          </Alert>
        )}

        {/* Tabela de preview */}
        <div className="max-h-[400px] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="w-16">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappedRows.map((row, index) => {
                const validation = validationResults[index]
                const isNewCompany =
                  row.companyName &&
                  newCompanyNames.has(row.companyName.trim())

                return (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{row.name || '—'}</TableCell>
                    <TableCell>{row.email || '—'}</TableCell>
                    <TableCell>{row.phone || '—'}</TableCell>
                    <TableCell>
                      {row.companyName ? (
                        <div className="flex items-center gap-1.5">
                          {row.companyName}
                          {isNewCompany && (
                            <Badge variant="outline" className="text-xs">
                              nova
                            </Badge>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell>{row.role || '—'}</TableCell>
                    <TableCell>
                      {validation.valid ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <span title={validation.errors.join(', ')}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>

        {/* Ações */}
        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={onBack} disabled={isPending}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <Button
            onClick={handleImport}
            disabled={!allValid || quotaExceeded || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importando...
              </>
            ) : (
              `Importar ${mappedRows.length} contato(s)`
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
