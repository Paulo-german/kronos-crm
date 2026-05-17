import { Card, CardContent } from '@/_components/ui/card'
import { Construction } from 'lucide-react'

export default function DashboardV2Page() {
  return (
    <div className="flex h-full items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <Construction className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Novo dashboard em construção</p>
          <p className="text-sm text-muted-foreground">
            Em breve aqui estará a visão da jornada dos seus clientes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
