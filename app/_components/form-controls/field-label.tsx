import { InfoIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/_components/ui/tooltip'

interface FieldLabelProps {
  label: string
  tooltip: string
}

// Rótulo de campo com ícone de informação e tooltip explicativo.
// Deve ser usado dentro de um <TooltipProvider> e de um <FormLabel>.
export const FieldLabel = ({ label, tooltip }: FieldLabelProps) => (
  <span className="flex items-center gap-1.5">
    {label}
    <Tooltip>
      <TooltipTrigger asChild>
        <InfoIcon className="size-3.5 cursor-help text-muted-foreground" />
      </TooltipTrigger>
      <TooltipContent className="max-w-56">{tooltip}</TooltipContent>
    </Tooltip>
  </span>
)
