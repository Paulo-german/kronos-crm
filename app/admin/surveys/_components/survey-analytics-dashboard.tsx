'use client'

import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ClipboardList } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/_components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/_components/ui/table'
import type { SurveyAnalyticsDto, UserProfileDto, SurveyDistributionItem } from '@/_data-access/admin/types'
import {
  ROLE_LABELS,
  TEAM_SIZE_LABELS,
  CRM_EXPERIENCE_LABELS,
  MAIN_CHALLENGE_LABELS,
  REFERRAL_SOURCE_LABELS,
} from '@/_components/welcome-survey/survey-labels'

interface SurveyAnalyticsDashboardProps {
  analytics: SurveyAnalyticsDto
  responses: UserProfileDto[]
}

interface DistributionCardProps {
  title: string
  items: SurveyDistributionItem[]
}

const DistributionCard = ({ title, items }: DistributionCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem dados ainda.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.value} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{item.label}</span>
                  <span className="text-muted-foreground">
                    {item.count} ({item.percentage}%)
                  </span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export const SurveyAnalyticsDashboard = ({
  analytics,
  responses,
}: SurveyAnalyticsDashboardProps) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Card destaque — total de respostas */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center gap-4 pt-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">
              {analytics.totalResponses.toLocaleString('pt-BR')}
            </p>
            <p className="text-sm text-muted-foreground">respostas coletadas</p>
          </div>
        </CardContent>
      </Card>

      {/* Cards de distribuição */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DistributionCard title="Cargo" items={analytics.byRole} />
        <DistributionCard title="Tamanho da equipe" items={analytics.byTeamSize} />
        <DistributionCard title="Experiência com CRM" items={analytics.byCrmExperience} />
        <DistributionCard title="Maior desafio" items={analytics.byMainChallenge} />
        <DistributionCard title="Canal de aquisição" items={analytics.byReferralSource} />
      </div>

      {/* Tabela de respostas individuais */}
      {responses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Respostas individuais
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Experiência</TableHead>
                  <TableHead>Desafio</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.map((response) => (
                  <TableRow key={response.id}>
                    <TableCell className="font-medium">
                      {response.organization.name}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium">
                          {response.user.fullName ?? '—'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {response.user.email}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      {ROLE_LABELS[response.role] ?? response.role}
                    </TableCell>
                    <TableCell className="text-xs">
                      {TEAM_SIZE_LABELS[response.teamSize] ?? response.teamSize}
                    </TableCell>
                    <TableCell className="text-xs">
                      {CRM_EXPERIENCE_LABELS[response.crmExperience] ?? response.crmExperience}
                    </TableCell>
                    <TableCell className="text-xs">
                      {MAIN_CHALLENGE_LABELS[response.mainChallenge] ?? response.mainChallenge}
                    </TableCell>
                    <TableCell className="text-xs">
                      {REFERRAL_SOURCE_LABELS[response.referralSource] ?? response.referralSource}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {response.profileCompletedAt
                        ? format(new Date(response.profileCompletedAt), 'dd/MM/yyyy', { locale: ptBR })
                        : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
