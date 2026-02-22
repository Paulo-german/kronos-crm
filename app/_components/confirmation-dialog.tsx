'use client'

import { Loader2 } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'

const iconVariants = cva(
  'flex h-12 w-12 items-center justify-center rounded-md',
  {
    variants: {
      variant: {
        default: 'bg-primary/20 text-primary',
        destructive: 'bg-destructive/20 text-destructive',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

interface ConfirmationDialogProps extends VariantProps<typeof iconVariants> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  icon: React.ReactNode
  onConfirm: () => void
  isLoading?: boolean
  confirmLabel?: string
}

const ConfirmationDialog = ({
  open,
  onOpenChange,
  title,
  description,
  icon,
  variant,
  onConfirm,
  isLoading,
  confirmLabel = 'Confirmar',
}: ConfirmationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col items-center justify-center gap-6">
        <DialogHeader className="space-y-4">
          <DialogTitle className="flex flex-col items-center justify-center gap-4">
            <div className={iconVariants({ variant })}>{icon}</div>
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-center" asChild>
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ConfirmationDialog
