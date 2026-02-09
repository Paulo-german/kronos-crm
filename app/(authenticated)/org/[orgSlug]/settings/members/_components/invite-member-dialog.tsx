'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/_components/ui/button'
import { Dialog, DialogTrigger } from '@/_components/ui/dialog'

import type { MemberRole } from '@prisma/client'
import InviteMemberDialogContent from './invite-dialog-content'

const InviteMemberDialog = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('MEMBER')

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Convidar Membro
        </Button>
      </DialogTrigger>
      <InviteMemberDialogContent setIsOpen={setIsOpen} />
    </Dialog>
  )
}

export default InviteMemberDialog
