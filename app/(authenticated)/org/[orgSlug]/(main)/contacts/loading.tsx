import { Skeleton } from '@/_components/ui/skeleton'

export default function ContactsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      {/* Table */}
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="max-h-[calc(100vh-180px)] overflow-y-auto">
            <table className="w-full caption-bottom text-sm">
              {/* Header */}
              <thead className="bg-secondary/20">
                <tr className="border-b">
                  <th className="p-4">
                    <Skeleton className="h-4 w-4" />
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
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="p-4">
                    <Skeleton className="h-4 w-6" />
                  </th>
                </tr>
              </thead>
              {/* Body */}
              <tbody className="bg-card/80">
                {Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-4">
                      <Skeleton className="h-4 w-4" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-44" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-28" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-6 w-12 rounded-full" />
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
