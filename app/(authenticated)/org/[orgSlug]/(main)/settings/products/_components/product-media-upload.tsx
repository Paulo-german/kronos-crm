'use client'

import { useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { UploadCloud, Loader2 } from 'lucide-react'
import { cn } from '@/_lib/utils'
import { uploadProductMedia } from '@/_actions/product/upload-product-media'

interface ProductMediaUploadProps {
  productId: string
  mediaType: 'IMAGE' | 'VIDEO'
  currentCount: number
  maxCount: number
  acceptedTypes: readonly string[]
  maxSize: number
  onUploadComplete?: () => void
}

export function ProductMediaUpload({
  productId,
  mediaType,
  currentCount,
  maxCount,
  acceptedTypes,
  maxSize,
  onUploadComplete,
}: ProductMediaUploadProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const remaining = maxCount - currentCount
  const isAtLimit = remaining <= 0

  const { execute, isPending } = useAction(uploadProductMedia, {
    onSuccess: () => {
      toast.success(
        mediaType === 'IMAGE'
          ? 'Imagem adicionada com sucesso.'
          : 'Vídeo adicionado com sucesso.',
      )
      router.refresh()
      onUploadComplete?.()
      if (inputRef.current) inputRef.current.value = ''
    },
    onError: ({ error }) => {
      const message =
        error.serverError ||
        (error.validationErrors?.file?._errors?.[0]) ||
        'Erro inesperado no upload.'
      toast.error(message)
      if (inputRef.current) inputRef.current.value = ''
    },
  })

  const validateAndUpload = useCallback(
    (file: File) => {
      // Validação client-side ANTES do upload
      if (isAtLimit) {
        toast.error(
          `Limite atingido. Máximo de ${maxCount} ${mediaType === 'IMAGE' ? 'imagem(ns)' : 'vídeo(s)'} por produto.`,
        )
        return
      }

      if (!acceptedTypes.includes(file.type)) {
        const extensions = acceptedTypes
          .map((type) => type.split('/')[1].toUpperCase())
          .join(', ')
        toast.error(`Tipo de arquivo inválido. Aceitos: ${extensions}`)
        return
      }

      if (file.size > maxSize) {
        const maxMB = Math.round(maxSize / (1024 * 1024))
        toast.error(`Arquivo muito grande. Tamanho máximo: ${maxMB}MB`)
        return
      }

      execute({ file, productId })
    },
    [productId, mediaType, maxSize, acceptedTypes, isAtLimit, maxCount, execute],
  )

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!isAtLimit && !isPending) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)

    if (isAtLimit || isPending) return

    const files = Array.from(event.dataTransfer.files)
    const file = files[0]
    if (!file) return

    validateAndUpload(file)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    validateAndUpload(file)
  }

  const handleClick = () => {
    if (isAtLimit || isPending) return
    inputRef.current?.click()
  }

  if (isAtLimit) return null

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Fazer upload de ${mediaType === 'IMAGE' ? 'imagem' : 'vídeo'}`}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') handleClick()
      }}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors',
        isDragOver
          ? 'border-primary bg-primary/5'
          : 'border-border/60 bg-muted/20 hover:border-primary/50 hover:bg-muted/40',
        (isPending || isAtLimit) &&
          'cursor-not-allowed opacity-60 hover:border-border/60 hover:bg-muted/20',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        accept={acceptedTypes.join(',')}
        onChange={handleFileChange}
        disabled={isPending || isAtLimit}
      />

      {isPending ? (
        <>
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
          <p className="text-sm font-medium text-muted-foreground">
            Enviando...
          </p>
        </>
      ) : (
        <>
          <UploadCloud className="h-7 w-7 text-muted-foreground" />
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              {mediaType === 'IMAGE' ? 'Adicionar imagem' : 'Adicionar vídeo'}
            </p>
            <p className="text-xs text-muted-foreground">
              {isDragOver
                ? 'Solte o arquivo aqui'
                : `Arraste ou clique para selecionar`}
            </p>
            <p className="text-xs text-muted-foreground">
              {acceptedTypes
                .map((type) => type.split('/')[1].toUpperCase())
                .join(', ')}{' '}
              — máx. {Math.round(maxSize / (1024 * 1024))}MB
            </p>
          </div>
          {remaining < maxCount && (
            <p className="text-xs text-muted-foreground">
              {remaining} restante{remaining !== 1 ? 's' : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}
