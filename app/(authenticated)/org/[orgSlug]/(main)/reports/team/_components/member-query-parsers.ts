import { parseAsString } from 'nuqs'

export const memberQueryParsers = {
  member: parseAsString.withOptions({ shallow: false }),
}
