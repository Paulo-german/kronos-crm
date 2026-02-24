import { Button } from '@/_components/ui/button'
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/_components/ui/sheet'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { Form } from '@/_components/ui/form'
import { useForm } from 'react-hook-form'
import {
  inviteMemberSchema,
  InviteMemberSchema,
} from '@/_actions/organization/invite-member/schema'
import { MemberRole } from '@prisma/client'
import { useAction } from 'next-safe-action/hooks'
import { inviteMember } from '@/_actions/organization/invite-member'
import { toast } from 'sonner'
import { Dispatch, SetStateAction } from 'react'

interface InviteMemberDialogContentProps {
  setIsOpen: Dispatch<SetStateAction<boolean>>
}

const InviteMemberDialogContent = ({
  setIsOpen,
}: InviteMemberDialogContentProps) => {
  const form = useForm<InviteMemberSchema>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: {
      email: '',
      role: MemberRole.MEMBER,
    },
  })

  const { execute: executeCreateMember, isPending } = useAction(inviteMember, {
    onSuccess: ({ data }) => {
      if (data?.success) {
        toast.success('Convite enviado com sucesso')
        handleCloseDialog()
      }
    },
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao enviar convite.')
    },
  })

  const onSubmit = (data: InviteMemberSchema) => {
    executeCreateMember(data)
  }

  const handleCloseDialog = () => {
    form.reset()
    setIsOpen(false)
  }

  return (
    <SheetContent className="overflow-y-auto sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Convidar Membro</SheetTitle>
        <SheetDescription>
          Envie um convite por e-mail para um novo membro da equipe.
        </SheetDescription>
      </SheetHeader>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>E-mail</FormLabel>
                <FormControl>
                  <Input placeholder="nome@empresa.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Função</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value={MemberRole.MEMBER}>Membro</SelectItem>
                    <SelectItem value={MemberRole.ADMIN}>
                      Administrador
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Membros podem visualizar e editar dados. Administradores podem
                  gerenciar configurações e convites.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleCloseDialog}
            >
              Cancelar
            </Button>
            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin" />
                  Enviar Convite
                </div>
              ) : (
                'Enviar Convite'
              )}
            </Button>
          </SheetFooter>
        </form>
      </Form>
    </SheetContent>
  )
}

export default InviteMemberDialogContent
