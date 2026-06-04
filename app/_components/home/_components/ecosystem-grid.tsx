import { Badge } from '@/_components/ui/badge'
import { Card, CardContent } from '@/_components/ui/card'
import { HOME_DATA } from '../_data/home-data'

const EcosystemGrid = () => {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        Ecossistema Kronos
      </h3>
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {HOME_DATA.ecosystem.map((tool) => {
          const Icon = tool.icon

          return (
            <a
              key={tool.id}
              href={tool.href}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Card className="h-full cursor-pointer border hover:border-primary/50 transition-colors">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm leading-tight">{tool.label}</p>
                      {tool.badge === 'em-breve' && (
                        <Badge variant="secondary">Em breve</Badge>
                      )}
                      {tool.badge === 'novo' && (
                        <Badge variant="default">Novo</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-snug">{tool.description}</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          )
        })}
      </div>
    </div>
  )
}

export default EcosystemGrid
