'use client'

import { useState } from 'react'
import { CheckIcon, CopyIcon } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/_components/ui/dialog'

interface EmbedSnippetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  formName: string
  publicToken: string
}

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? ''

export const EmbedSnippetDialog = ({
  open,
  onOpenChange,
  formName,
  publicToken,
}: EmbedSnippetDialogProps) => {
  const [copied, setCopied] = useState(false)

  const formUrl = `${BASE_URL}/f/${publicToken}`

  const snippet = `<iframe
  src="${formUrl}"
  style="border:none;width:100%;min-height:400px;"
  title="${formName}"
></iframe>
<script>
window.addEventListener('message', function(e) {
  if (e.data?.type === 'kronos:resize') {
    document.querySelector('iframe[src^="${formUrl}"]').style.height = e.data.height + 'px';
  }
});
</script>`

  const handleCopy = async () => {
    await navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Código de embed — {formName}</DialogTitle>
          <DialogDescription>
            Cole este código no HTML do seu site onde deseja exibir o formulário.
          </DialogDescription>
        </DialogHeader>

        <div className="relative rounded-md border bg-muted/40 p-4">
          <pre className="overflow-x-auto text-xs text-foreground">
            <code>{snippet}</code>
          </pre>
          <Button
            size="sm"
            variant="outline"
            className="absolute right-3 top-3"
            onClick={handleCopy}
          >
            {copied ? <CheckIcon size={14} className="mr-1.5" /> : <CopyIcon size={14} className="mr-1.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          URL direta: <span className="font-mono">{formUrl}</span>
        </p>
      </DialogContent>
    </Dialog>
  )
}
