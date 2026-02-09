'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAction } from 'next-safe-action/hooks'
import { toast } from 'sonner'
import { Loader2, User } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { Input } from '@/_components/ui/input'
import { Button } from '@/_components/ui/button'
import { Label } from '@/_components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/_components/ui/avatar'
import { updateProfile } from '@/_actions/user/update-profile'
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from '@/_actions/user/update-profile/schema'

interface UserProfile {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  createdAt: Date | string
}

interface ProfileFormProps {
  user: UserProfile
}

export function ProfileForm({ user }: ProfileFormProps) {
  const form = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      fullName: user.fullName ?? '',
      avatarUrl: user.avatarUrl,
    },
  })

  const { execute: executeUpdateProfile, isPending } = useAction(
    updateProfile,
    {
      onSuccess: () => {
        toast.success('Perfil atualizado com sucesso!')
        form.reset({
          fullName: form.getValues('fullName'),
          avatarUrl: form.getValues('avatarUrl'),
        })
      },
      onError: ({ error }) => {
        toast.error(error.serverError || 'Erro ao atualizar perfil.')
      },
    },
  )

  const onSubmit = (data: UpdateProfileInput) => {
    executeUpdateProfile(data)
  }

  const watchedName = form.watch('fullName')
  const watchedAvatar = form.watch('avatarUrl')

  const hasChanges =
    watchedName !== (user.fullName ?? '') || watchedAvatar !== user.avatarUrl

  const initials = (watchedName || user.email)
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const createdAtDate = new Date(user.createdAt)
  const formattedDate = !isNaN(createdAtDate.getTime())
    ? new Intl.DateTimeFormat('pt-BR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(createdAtDate)
    : '-'

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações pessoais</CardTitle>
        <CardDescription>Atualize seu nome e foto de perfil.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex items-start gap-6">
              <Avatar className="size-20">
                <AvatarImage src={watchedAvatar ?? undefined} />
                <AvatarFallback className="text-lg">
                  {initials || <User className="size-8" />}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-4">
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL da foto</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://exemplo.com/foto.jpg"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) =>
                            field.onChange(e.target.value || null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome completo</FormLabel>
                  <FormControl>
                    <Input placeholder="Seu nome completo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={!hasChanges || isPending}>
              {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Salvar alterações
            </Button>
          </form>
        </Form>

        <hr className="border-border" />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">{user.email}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">
              Membro desde
            </Label>
            <p className="text-sm font-medium">{formattedDate}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
