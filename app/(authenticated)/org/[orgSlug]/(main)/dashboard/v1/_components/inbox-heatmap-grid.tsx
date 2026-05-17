'use client'

import { cn } from '@/_lib/utils'
import type { HourlyHeatmapEntry } from '@/_data-access/dashboard'

const DAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const HOURS = Array.from({ length: 24 }, (_unused, hour) => hour)

// Retorna a classe de cor baseada na intensidade normalizada (0-1)
function getIntensityClass(normalized: number): string {
  if (normalized === 0) return 'bg-muted/30'
  if (normalized < 0.15) return 'bg-primary/10'
  if (normalized < 0.3) return 'bg-primary/20'
  if (normalized < 0.45) return 'bg-primary/35'
  if (normalized < 0.6) return 'bg-primary/50'
  if (normalized < 0.75) return 'bg-primary/65'
  if (normalized < 0.9) return 'bg-primary/80'
  return 'bg-primary'
}

// Intensidades para a legenda
const LEGEND_INTENSITIES = [0, 0.15, 0.35, 0.55, 0.75, 1]

interface InboxHeatmapGridProps {
  data: HourlyHeatmapEntry[]
}

export function InboxHeatmapGrid({ data }: InboxHeatmapGridProps) {
  // Indexar os dados num mapa para lookup O(1)
  const countMap = new Map<string, number>()
  for (const entry of data) {
    countMap.set(`${entry.dayOfWeek}-${entry.hour}`, entry.count)
  }

  const maxCount =
    data.length > 0 ? Math.max(...data.map((entry) => entry.count)) : 0

  function getCount(day: number, hour: number): number {
    return countMap.get(`${day}-${hour}`) ?? 0
  }

  function getNormalized(day: number, hour: number): number {
    if (maxCount === 0) return 0
    return getCount(day, hour) / maxCount
  }

  // Grid com 24 colunas usando CSS grid inline
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(24, 1fr)',
    gap: '2px',
    flex: 1,
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        {/* Cabeçalho: horas (apenas múltiplos de 3) */}
        <div className="mb-1 flex">
          {/* Espaço para label do dia */}
          <div className="w-10 shrink-0" />
          <div style={gridStyle}>
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="text-center text-[10px] text-muted-foreground"
              >
                {hour % 3 === 0 ? `${hour}h` : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Grade: 7 dias x 24 horas */}
        <div className="flex flex-col gap-0.5">
          {DAY_LABELS.map((dayLabel, dayIndex) => (
            <div key={dayLabel} className="flex items-center gap-1">
              {/* Label do dia */}
              <div className="w-10 shrink-0 text-right text-[10px] text-muted-foreground">
                {dayLabel}
              </div>
              <div style={gridStyle}>
                {HOURS.map((hour) => {
                  const count = getCount(dayIndex, hour)
                  const normalized = getNormalized(dayIndex, hour)

                  return (
                    <div
                      key={hour}
                      title={`${dayLabel} ${hour}h: ${count} mensagens`}
                      className={cn(
                        'aspect-square rounded-sm transition-opacity hover:opacity-80',
                        getIntensityClass(normalized),
                      )}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Legenda de escala */}
        <div className="mt-3 flex items-center justify-end gap-2">
          <span className="text-[10px] text-muted-foreground">Menos</span>
          <div className="flex gap-0.5">
            {LEGEND_INTENSITIES.map((intensity) => (
              <div
                key={intensity}
                className={cn(
                  'size-3 rounded-sm',
                  getIntensityClass(intensity),
                )}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground">Mais</span>
        </div>
      </div>
    </div>
  )
}
