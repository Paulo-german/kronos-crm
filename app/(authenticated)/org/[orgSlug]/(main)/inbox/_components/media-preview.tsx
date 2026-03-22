'use client'

import { FileSpreadsheet, FileText, File, X } from 'lucide-react'
import { Button } from '@/_components/ui/button'

interface MediaPreviewProps {
  file: File
  previewUrl: string | null
  onRemove: () => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getDocumentIcon(mimetype: string) {
  if (mimetype === 'application/pdf') return FileText
  if (mimetype.includes('spreadsheet') || mimetype.includes('excel')) return FileSpreadsheet
  return File
}

export function MediaPreview({ file, previewUrl, onRemove }: MediaPreviewProps) {
  const isImage = file.type.startsWith('image/')

  return (
    <div className="relative mx-2 mb-1 inline-flex items-start gap-2 rounded-lg border border-border/30 bg-secondary/30 p-2">
      {isImage && previewUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={previewUrl}
          alt={file.name}
          className="max-h-32 max-w-[200px] rounded-md object-contain"
        />
      ) : (
        <div className="flex items-center gap-2 rounded-md bg-secondary/50 px-3 py-2">
          {(() => {
            const Icon = getDocumentIcon(file.type)
            return <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
          })()}
          <div className="flex flex-col">
            <span className="max-w-[180px] truncate text-sm font-medium">
              {file.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </div>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={onRemove}
        className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-secondary shadow-sm hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )
}
