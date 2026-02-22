'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, KeyRound } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/_components/ui/sheet'
import ConfirmationDialog from '@/_components/confirmation-dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Button } from '@/_components/ui/button'
import { changePassword } from '@/_actions/user/change-password'
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from '@/_actions/user/change-password/schema'
import InputPassword from '@/(auth)/login/_components/input-password'

const ChangePasswordSheet = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingData, setPendingData] = useState<ChangePasswordInput | null>(
    null,
  )

  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })

  const { execute: executeUpdatePassword, isPending } = useAction(
    changePassword,
    {
      onSuccess: () => {
        toast.success('Senha alterada com sucesso!')
        form.reset()
        setIsOpen(false)
        setShowConfirmDialog(false)
        setPendingData(null)
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao alterar senha.')
        setShowConfirmDialog(false)
        setPendingData(null)
      },
    },
  )

  const onSubmit = (data: ChangePasswordInput) => {
    setPendingData(data)
    setShowConfirmDialog(true)
  }

  const handleConfirm = () => {
    if (pendingData) {
      executeUpdatePassword(pendingData)
    }
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="outline">
            <KeyRound className="mr-2 size-4" />
            Alterar senha
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Alterar senha</SheetTitle>
            <SheetDescription>
              Digite sua senha atual e escolha uma nova senha.
            </SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="mt-6 space-y-4"
            >
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha atual</FormLabel>
                    <FormControl>
                      <InputPassword
                        {...field}
                        placeholder="Digite a senha atual"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <InputPassword
                        {...field}
                        placeholder="Digite a nova senha"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <FormControl>
                      <InputPassword
                        {...field}
                        placeholder="Confirme a nova senha"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                Alterar senha
              </Button>
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <ConfirmationDialog
        open={showConfirmDialog}
        onOpenChange={(open) => {
          setShowConfirmDialog(open)
          if (!open) setPendingData(null)
        }}
        title="Confirmar alteração de senha"
        description={
          <p>
            Você está prestes a alterar sua senha. Esta é uma ação sensível. Tem
            certeza que deseja continuar?
          </p>
        }
        icon={<KeyRound />}
        onConfirm={handleConfirm}
        isLoading={isPending}
        confirmLabel="Confirmar"
      />
    </>
  )
}

export default ChangePasswordSheet
