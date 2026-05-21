'use client'

import { parseAsString, useQueryState } from 'nuqs'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/_components/ui/tabs'
import { UserIcon, UsersRound } from 'lucide-react'

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
      <TabsList className="mb-6 grid h-12 w-full grid-cols-2 rounded-md border border-border/50">
        <TabsTrigger
          value="members"
          className="flex items-center gap-2 rounded-md py-2"
        >
          <UserIcon className="h-4 w-4" />
          Membros
        </TabsTrigger>
        <TabsTrigger
          value="squads"
          className="flex items-center gap-2 rounded-md py-2"
        >
          <UsersRound className="h-4 w-4" />
          Equipes
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
