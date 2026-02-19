import { Check, X } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import { COMPARISON_DATA } from './plans-data'

function CellValue({ value }: { value: string | boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className="mx-auto size-5 text-green-500" />
    ) : (
      <X className="mx-auto size-5 text-muted-foreground/50" />
    )
  }

  return <span>{value}</span>
}

export function ComparisonTable() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Comparativo de planos</h2>
        <p className="text-sm text-muted-foreground">
          Veja o que cada plano oferece em detalhes.
        </p>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader className="bg-secondary/20">
            <TableRow className="p-4">
              <TableHead className="w-[40%] p-4">Recurso</TableHead>
              <TableHead className="text-center">Essential</TableHead>
              <TableHead className="text-center">Scale</TableHead>
              <TableHead className="text-center">Enterprise</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {COMPARISON_DATA.map((row) => (
              <TableRow key={row.feature} className="bg-card/80">
                <TableCell className="p-3 font-medium">{row.feature}</TableCell>
                <TableCell className="text-center">
                  <CellValue value={row.essential} />
                </TableCell>
                <TableCell className="text-center">
                  <CellValue value={row.scale} />
                </TableCell>
                <TableCell className="text-center">
                  <CellValue value={row.enterprise} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
