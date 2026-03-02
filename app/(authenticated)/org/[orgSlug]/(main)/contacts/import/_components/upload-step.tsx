'use client'

import { useCallback, useRef, useState } from 'react'
import { Upload, FileSpreadsheet, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Card, CardContent } from '@/_components/ui/card'
import { cn } from '@/_lib/utils'

interface ParsedData {
  headers: string[]
  rows: string[][]
}

interface UploadStepProps {
  onParsed: (data: ParsedData) => void
}

export function UploadStep({ onParsed }: UploadStepProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const parseFile = useCallback(
    async (file: File) => {
      setError(null)
      setFileName(file.name)

      const validExtensions = ['.csv', '.xlsx', '.xls']
      const extension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'))

      if (!validExtensions.includes(extension)) {
        setError('Formato inválido. Envie um arquivo CSV, XLSX ou XLS.')
        setFileName(null)
        return
      }

      try {
        const XLSX = await import('xlsx')
        const arrayBuffer = await file.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
          header: 1,
        })

        // Filtrar linhas completamente vazias
        const data = rawData.filter((row) =>
          row.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== ''),
        )

        if (data.length < 2) {
          setError(
            'O arquivo deve ter pelo menos 2 linhas (cabeçalho + 1 registro).',
          )
          return
        }

        const headers = data[0].map((header) => String(header).trim())
        const rows = data.slice(1).map((row) =>
          headers.map((_, colIndex) => {
            const cell = row[colIndex]
            return cell !== undefined && cell !== null ? String(cell).trim() : ''
          }),
        )

        onParsed({ headers, rows })
      } catch {
        setError('Erro ao ler o arquivo. Verifique se o formato é válido.')
        setFileName(null)
      }
    },
    [onParsed],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      setIsDragging(false)

      const file = event.dataTransfer.files[0]
      if (file) {
        parseFile(file)
      }
    },
    [parseFile],
  )

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (file) {
        parseFile(file)
      }
    },
    [parseFile],
  )

  return (
    <Card>
      <CardContent className="pt-6">
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          )}
        >
          {fileName ? (
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-muted-foreground">
                  Processando...
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFileName(null)
                  setError(null)
                  if (inputRef.current) {
                    inputRef.current.value = ''
                  }
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="mb-1 text-sm font-medium">
                Arraste seu arquivo aqui ou clique para selecionar
              </p>
              <p className="mb-4 text-xs text-muted-foreground">
                Formatos aceitos: CSV, XLSX, XLS
              </p>
              <Button
                variant="outline"
                onClick={() => inputRef.current?.click()}
              >
                Selecionar arquivo
              </Button>
            </>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </CardContent>
    </Card>
  )
}
