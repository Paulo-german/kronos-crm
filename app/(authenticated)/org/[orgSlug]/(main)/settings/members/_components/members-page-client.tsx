'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { Users, Shield } from 'lucide-react'

interface MembersPageClientProps {
  membersContent: React.ReactNode
  squadsContent: React.ReactNode
}

export function MembersPageClient({
  membersContent,
  squadsContent,
}: MembersPageClientProps) {
  const [activeTab, setActiveTab] = useQueryState(
    'tab',
    parseAsString.withDefault('members'),
  )

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid-cols-2 border-border/50 bg-tab/30 mb-6 grid h-12 w-full rounded-md border">
        <TabsTrigger
          value="members"
          className="data-[state=active]:bg-card/80 flex items-center gap-2 rounded-md py-2"
        >
          <Users className="h-4 w-4" />
          Membros
        </TabsTrigger>
        <TabsTrigger
          value="squads"
          className="data-[state=active]:bg-card/80 flex items-center gap-2 rounded-md py-2"
        >
          <Shield className="h-4 w-4" />
          Times
        </TabsTrigger>
      </TabsList>

      <TabsContent value="members" className="mt-0">
        {membersContent}
      </TabsContent>

      <TabsContent value="squads" className="mt-0">
        {squadsContent}
      </TabsContent>
    </Tabs>
  )
}
