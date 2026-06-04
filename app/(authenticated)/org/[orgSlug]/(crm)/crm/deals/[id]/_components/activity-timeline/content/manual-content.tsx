interface ManualContentProps {
  content: string
}

export function ManualContent({ content }: ManualContentProps) {
  return (
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{content}</p>
  )
}
