interface SystemContentProps {
  content: string
}

export function SystemContent({ content }: SystemContentProps) {
  return (
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{content}</p>
  )
}
