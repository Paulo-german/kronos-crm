interface ReportsSectionHeaderProps {
  title: string
  description?: string
}

export function ReportsSectionHeader({ title, description }: ReportsSectionHeaderProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
