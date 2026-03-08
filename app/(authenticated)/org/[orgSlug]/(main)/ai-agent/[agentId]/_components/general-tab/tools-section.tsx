import { Checkbox } from '@/_components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import { Label } from '@/_components/ui/label'
import { TOOL_OPTIONS } from '../constants'
import type { SectionProps } from './types'

export const ToolsSection = ({ form, canManage }: SectionProps) => {
  const watchToolsEnabled = form.watch('toolsEnabled')

  const handleToggleTool = (toolValue: string) => {
    const current = form.getValues('toolsEnabled')
    const updated = current.includes(toolValue)
      ? current.filter((value) => value !== toolValue)
      : [...current, toolValue]
    form.setValue('toolsEnabled', updated, { shouldDirty: true })
  }

  return (
    <Card className="border-border/50 bg-secondary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Ferramentas Habilitadas</CardTitle>
        <CardDescription>
          Ações que o agente pode executar durante conversas.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {TOOL_OPTIONS.map((tool) => (
            <div
              key={tool.value}
              className="flex items-start space-x-3 rounded-md border border-border/50 bg-background/70 p-3"
            >
              <Checkbox
                id={`tool-${tool.value}`}
                checked={watchToolsEnabled.includes(tool.value)}
                onCheckedChange={() => handleToggleTool(tool.value)}
                disabled={!canManage}
              />
              <div className="space-y-1">
                <Label
                  htmlFor={`tool-${tool.value}`}
                  className="cursor-pointer"
                >
                  {tool.label}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {tool.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
