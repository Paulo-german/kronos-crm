'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Upload, FileIcon, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Badge } from '@/_components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import { deleteKnowledgeFile } from '@/_actions/agent/delete-knowledge-file'
import type {
  AgentDetailDto,
  AgentKnowledgeFileDto,
} from '@/_data-access/agent/get-agent-by-id'

const ACCEPTED_TYPES = '.pdf,.txt,.md,.docx'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const STATUS_BADGE_MAP: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
> = {
  PENDING: { label: 'Pendente', variant: 'outline' },
  PROCESSING: { label: 'Processando', variant: 'default' },
  COMPLETED: { label: 'Concluído', variant: 'default' },
  FAILED: { label: 'Erro', variant: 'destructive' },
}

interface KnowledgeTabProps {
  agent: AgentDetailDto
  canManage: boolean
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const POLLING_INTERVAL_MS = 5000

const KnowledgeTab = ({ agent, canManage }: KnowledgeTabProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isUploading, setIsUploading] = useState(false)
  const [deletingFile, setDeletingFile] = useState<AgentKnowledgeFileDto | null>(
    null,
  )
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  // Polling: atualiza dados enquanto houver arquivos processando
  const hasProcessingFiles = agent.knowledgeFiles.some(
    (file) => file.status === 'PROCESSING',
  )

  useEffect(() => {
    if (!hasProcessingFiles) return

    const interval = setInterval(() => {
      router.refresh()
    }, POLLING_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [hasProcessingFiles, router])

  const { execute: executeDelete, isPending: isDeletingFile } = useAction(
    deleteKnowledgeFile,
    {
      onSuccess: () => {
        toast.success('Arquivo excluído com sucesso!')
        setIsDeleteOpen(false)
        setDeletingFile(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao excluir arquivo.')
      },
    },
  )

  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || isUploading) return

      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_SIZE) {
          toast.error(`Arquivo "${file.name}" excede o limite de 10MB.`)
          continue
        }

        setIsUploading(true)

        try {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('agentId', agent.id)

          const response = await fetch('/api/knowledge/upload', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json()

          if (!response.ok) {
            toast.error(data.error || 'Erro ao enviar arquivo.')
          } else {
            toast.success('Arquivo enviado para processamento!')
            router.refresh()
          }
        } catch {
          toast.error('Erro ao enviar arquivo. Tente novamente.')
        } finally {
          setIsUploading(false)
        }
      }

      // Limpa o input para permitir re-seleção do mesmo arquivo
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [agent.id, isUploading, router],
  )

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()
      handleFileSelect(event.dataTransfer.files)
    },
    [handleFileSelect],
  )

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {canManage && (
        <Card className="border-border/50 bg-secondary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Upload de Arquivos</CardTitle>
            <CardDescription>
              Adicione documentos para a base de conhecimento do agente.
              Formatos aceitos: PDF, TXT, MD, DOCX (máx. 10MB).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={isUploading ? undefined : handleDrop}
              onDragOver={isUploading ? undefined : handleDragOver}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed p-8 transition-colors ${
                isUploading
                  ? 'border-primary/50 bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50'
              }`}
            >
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              ) : (
                <Upload className="h-8 w-8 text-muted-foreground" />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {isUploading
                    ? 'Enviando arquivo...'
                    : 'Arraste arquivos ou clique para selecionar'}
                </p>
                <p className="text-xs text-muted-foreground">
                  PDF, TXT, MD, DOCX — máximo 10MB por arquivo
                </p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              className="hidden"
              onChange={(event) => handleFileSelect(event.target.files)}
            />
          </CardContent>
        </Card>
      )}

      {/* File List */}
      <Card className="border-border/50 bg-secondary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Arquivos</CardTitle>
          <CardDescription>
            {agent.knowledgeFiles.length === 0
              ? 'Nenhum arquivo adicionado.'
              : `${agent.knowledgeFiles.length} arquivo(s) na base de conhecimento.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {agent.knowledgeFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div className="rounded-full bg-muted p-4">
                <FileIcon className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Nenhum arquivo na base de conhecimento.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {agent.knowledgeFiles.map((file) => {
                const statusInfo = STATUS_BADGE_MAP[file.status] || {
                  label: file.status,
                  variant: 'secondary' as const,
                }

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-md border border-border/50 bg-background/70 p-3"
                  >
                    <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.fileSize)}
                        {file.chunkCount > 0 &&
                          ` · ${file.chunkCount} chunks`}
                      </p>
                    </div>
                    <Badge variant={statusInfo.variant}>
                      {statusInfo.label}
                    </Badge>
                    {canManage && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDeletingFile(file)
                          setIsDeleteOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          setIsDeleteOpen(open)
          if (!open) setDeletingFile(null)
        }}
        title="Excluir arquivo?"
        description={
          <p>
            Você está prestes a remover o arquivo{' '}
            <span className="font-bold text-foreground">
              {deletingFile?.fileName}
            </span>
            . Esta ação não pode ser desfeita.
          </p>
        }
        icon={<Trash2 />}
        variant="destructive"
        onConfirm={() => {
          if (deletingFile)
            executeDelete({ id: deletingFile.id, agentId: agent.id })
        }}
        isLoading={isDeletingFile}
        confirmLabel="Confirmar Exclusão"
      />
    </div>
  )
}

export default KnowledgeTab
