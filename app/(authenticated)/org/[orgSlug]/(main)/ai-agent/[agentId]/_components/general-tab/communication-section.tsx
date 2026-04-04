import { Switch } from '@/_components/ui/switch'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/_components/ui/select'
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/_components/ui/form'
import { TONE_OPTIONS, RESPONSE_LENGTH_OPTIONS, LANGUAGE_OPTIONS } from '../constants'
import type { SectionProps } from './types'

export const CommunicationSection = ({ form, canManage }: SectionProps) => {
  return (
    <Card className="border-border/50 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Comunicação</CardTitle>
        <CardDescription>
          Tom de voz, tamanho das respostas e idioma.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="promptConfig.tone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tom de voz</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {TONE_OPTIONS.map((tone) => (
                      <SelectItem key={tone.value} value={tone.value}>
                        {tone.label}
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
            name="promptConfig.responseLength"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tamanho das respostas</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {RESPONSE_LENGTH_OPTIONS.map((length) => (
                      <SelectItem key={length.value} value={length.value}>
                        <div className="flex items-baseline gap-2">
                          <span>{length.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {length.description}
                          </span>
                        </div>
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
            name="promptConfig.language"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Idioma</FormLabel>
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={!canManage}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
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
            name="promptConfig.useEmojis"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-3 space-y-0 self-end rounded-md border border-border/50 bg-background/70 px-4 py-3">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={!canManage}
                  />
                </FormControl>
                <FormLabel>Usar emojis</FormLabel>
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  )
}
