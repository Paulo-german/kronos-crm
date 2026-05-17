interface ScoreBreakdownPanelProps {
  mainDriver: string
  mainDriverKey: string
}

export function ScoreBreakdownPanel({ mainDriver }: ScoreBreakdownPanelProps) {
  return (
    <p className="text-sm text-muted-foreground">{mainDriver}</p>
  )
}
