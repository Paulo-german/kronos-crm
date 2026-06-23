import type { LucideIcon } from 'lucide-react'
import Header, {
  HeaderLeft,
  HeaderTitle,
  HeaderSubTitle,
} from '@/_components/header'

interface ComingSoonProps {
  title: string
  subtitle: string
  icon: LucideIcon
  description: string
  phase?: string
}

export const ComingSoon = ({
  title,
  subtitle,
  icon: Icon,
  description,
  phase,
}: ComingSoonProps) => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <Header>
        <HeaderLeft>
          <HeaderTitle>{title}</HeaderTitle>
          <HeaderSubTitle>{subtitle}</HeaderSubTitle>
        </HeaderLeft>
      </Header>

      <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-20 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-kronos-orange/15 text-kronos-orange">
          <Icon className="size-7" />
        </div>
        {phase && (
          <span className="rounded-full bg-kronos-orange/10 px-2.5 py-0.5 text-xs font-semibold text-kronos-orange">
            {phase}
          </span>
        )}
        <p className="text-base font-semibold">Em breve</p>
        <p className="max-w-md text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}
