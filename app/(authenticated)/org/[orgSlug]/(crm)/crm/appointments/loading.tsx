import { Skeleton } from '@/_components/ui/skeleton'

export default function AppointmentsLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Linha 1: View toggle + criar */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[200px] rounded-lg" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-44 rounded-md" />
        </div>

        {/* Linha 2: Select responsável + filtros */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[300px] rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>

      {/* Table */}
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="bg-secondary/20">
                <tr className="border-b">
                  <th className="p-4">
                    <Skeleton className="h-4 w-14" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-12" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-36" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-6" />
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card/80">
                {Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-4">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-24 rounded-md" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-16 rounded-md" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-48" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-14" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-6" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-end space-x-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-[70px] rounded-md" />
          </div>
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center space-x-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  )
}
