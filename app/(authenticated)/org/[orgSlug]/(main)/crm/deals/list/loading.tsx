import { Skeleton } from '@/_components/ui/skeleton'

export default function DealsListLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-9 w-52 rounded-lg" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Table */}
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="bg-secondary/20">
                <tr className="border-b">
                  <th className="p-4">
                    <Skeleton className="h-4 w-4" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-14" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-14" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-12" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-24" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-24" />
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
                      <Skeleton className="h-4 w-4" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-40" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-24 rounded-md" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-16 rounded-md" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-28" />
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
