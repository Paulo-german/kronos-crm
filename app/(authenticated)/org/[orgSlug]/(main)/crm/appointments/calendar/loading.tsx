import { Skeleton } from '@/_components/ui/skeleton'

const WEEKDAY_COLUMNS = 7
const CALENDAR_ROWS = 5

const AppointmentsCalendarLoading = () => {
  return (
    <div className="space-y-6">
      {/* Skeleton do Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>

      {/* Skeleton da Toolbar */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-24 rounded-lg" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-44" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[300px]" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>

      {/* Skeleton da navegação do mês */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-36" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-14" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>

      {/* Skeleton do grid do calendário */}
      <div className="rounded-lg border">
        {/* Cabeçalho: dias da semana */}
        <div className="grid grid-cols-7 border-b">
          {Array.from({ length: WEEKDAY_COLUMNS }).map((_, index) => (
            <Skeleton key={index} className="m-2 h-8" />
          ))}
        </div>

        {/* 5 linhas x 7 colunas */}
        {Array.from({ length: CALENDAR_ROWS }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid grid-cols-7 border-b last:border-0"
          >
            {Array.from({ length: WEEKDAY_COLUMNS }).map((_, colIndex) => (
              <div
                key={colIndex}
                className="min-h-[120px] border-r p-2 last:border-r-0"
              >
                <Skeleton className="mb-2 h-4 w-6" />
                <Skeleton className="mb-1 h-5 w-full" />
                <Skeleton className="h-5 w-3/4" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default AppointmentsCalendarLoading
