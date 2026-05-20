'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Sheet, SheetTrigger } from '@/_components/ui/sheet'
import { UpsertWebhookSheetContent } from './upsert-webhook-sheet-content'

export function CreateWebhookButton() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo Webhook
        </Button>
      </SheetTrigger>
      <UpsertWebhookSheetContent
        key={open ? 'open' : 'closed'}
        onSuccess={() => setOpen(false)}
      />
    </Sheet>
  )
}
