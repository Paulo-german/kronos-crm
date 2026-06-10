'use client'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Input } from '@/_components/ui/input'
import { PhoneInput } from '@/_components/form-controls/phone-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import { Button } from '@/_components/ui/button'
import InputPassword from '../../_components/input-password'
import {
  signUpFormSchema,
  SignUpFormSchema,
} from '@/_actions/auth/sign-up/schema'
import { useAction } from 'next-safe-action/hooks'
import { signUp } from '@/_actions/auth/sign-up'
import { PasswordChecklist } from './password-checklist'
import { toast } from 'sonner'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { BLUEPRINTS } from '@/_lib/onboarding/blueprints'

const NICHE_OPTIONS = BLUEPRINTS.filter(
  (blueprint) => blueprint.key !== 'ai_generated',
)
const STEP_1_FIELDS = ['fullName', 'email', 'phone', 'password'] as const
const STEP_LABELS = ['Sua conta', 'Sua empresa']

const SignUpForm = () => {
  const [step, setStep] = useState<1 | 2>(1)
  const { executeRecaptcha } = useGoogleReCaptcha()

  const form = useForm<SignUpFormSchema>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      fullName: '',
      companyName: '',
      websiteOrInstagram: '',
      phone: '',
      niche: '',
      email: '',
      password: '',
    },
  })

  const password = form.watch('password')

  const { execute, isPending } = useAction(signUp, {
    onError: ({ error }) => {
      toast.error(error.serverError || 'Erro ao criar conta.')
    },
  })

  const handleNextStep = async () => {
    const isValid = await form.trigger(STEP_1_FIELDS)
    if (isValid) setStep(2)
  }

  const onSubmit = async (data: SignUpFormSchema) => {
    if (!executeRecaptcha) {
      toast.error('reCAPTCHA não carregado. Tente novamente.')
      return
    }

    const captchaToken = await executeRecaptcha('signup')
    execute({ ...data, captchaToken })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {STEP_LABELS.map((label, index) => {
          const stepNumber = index + 1
          const isActive = step === stepNumber
          const isCompleted = step > stepNumber

          return (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : isCompleted
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {stepNumber}
              </div>
              <span
                className={`text-sm transition-colors ${
                  isActive
                    ? 'font-medium text-foreground'
                    : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
              {index < STEP_LABELS.length - 1 && (
                <div className="mx-1 h-px w-8 bg-border" />
              )}
            </div>
          )
        })}
      </div>

      <Form {...form}>
        <form
          className="space-y-4 text-left"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          {step === 1 && (
            <>
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
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="comercial@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <PhoneInput
                        value={field.value || ''}
                        onChange={(value) => field.onChange(value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <InputPassword {...field} />
                    </FormControl>
                    <FormMessage />
                    <PasswordChecklist value={password} />
                  </FormItem>
                )}
              />
              <Button
                type="button"
                className="mt-4 w-full"
                onClick={handleNextStep}
              >
                Próximo
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da empresa</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Studio Silva & Associados"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="niche"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento de atuação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o segmento" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {NICHE_OPTIONS.map((blueprint) => (
                          <SelectItem key={blueprint.key} value={blueprint.key}>
                            {blueprint.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="websiteOrInstagram"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Site ou Instagram da empresa{' '}
                      <span className="font-normal text-muted-foreground">
                        (opcional)
                      </span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://suaempresa.com ou @suaempresa"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setStep(1)}
                  disabled={isPending}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar conta'
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </Form>
    </div>
  )
}

export default SignUpForm
