import {
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog'
import { cva, type VariantProps } from 'class-variance-authority'

interface AlertDialogContentProps extends VariantProps<typeof alertVariants> {
  title: string
  description: React.ReactNode
  icon: React.ReactNode

  children: React.ReactNode
}

const alertVariants = cva(
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

const ConfirmationDialogContent = ({
  title,
  description,
  icon,
  children,
  variant,
}: AlertDialogContentProps) => {
  return (
    <AlertDialogContent className="flex flex-col items-center justify-center gap-6">
      <AlertDialogHeader className="space-y-4">
        <AlertDialogTitle className="flex flex-col items-center justify-center gap-4">
          <div className={alertVariants({ variant })}>{icon}</div>
          <span>{title}</span>
        </AlertDialogTitle>
        <AlertDialogDescription className="text-center" asChild>
          {description}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancelar</AlertDialogCancel>
        {children}
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

export default ConfirmationDialogContent
