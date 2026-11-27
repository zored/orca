import { matchesAiVaultQueryOperators } from '../../../shared/ai-vault/session-display/ai-vault-session-filters'
import type SyncDatabase from '../../sqlite/sync-database'
import type { SessionRow } from './session-search-hit-ranking'
import type { RetrievalScope } from './session-search-retrieval'

type MetadataMatches = { sessions: SessionRow[]; incomplete: boolean }

export class SessionSearchMetadata {
  constructor(
    private readonly db: SyncDatabase,
    private readonly columns: string
  ) {
    let query: string | null = null
    let terms: string[] = []
    db.function('session_search_matches_title', (title, encodedTerms) => {
      if (typeof title !== 'string' || typeof encodedTerms !== 'string') {
        return 0
      }
      if (encodedTerms !== query) {
        terms = JSON.parse(encodedTerms)
        query = encodedTerms
      }
      const folded = foldTitle(title)
      return Number(terms.every((term) => folded.includes(term)))
    })
  }

  find(
    terms: readonly string[],
    repoTerms: readonly string[],
    scope: RetrievalScope,
    scanLimit: number
  ): MetadataMatches {
    const conditions = [...scope.filter.conditions]
    const values = [...scope.filter.values]
    if (repoTerms.length > 0) {
      // Test each folder label once before evaluating individual titles.
      const cwds = this.db
        .prepare("SELECT DISTINCT coalesce(cwd, '') AS cwd FROM sessions")
        .all()
        .flatMap(({ cwd }) =>
          typeof cwd === 'string' &&
          matchesAiVaultQueryOperators({ cwd, filePath: '' }, { repoTerms, pathTerms: [] })
            ? [cwd]
            : []
        )
      if (cwds.length === 0) {
        return { sessions: [], incomplete: false }
      }
      conditions.push("coalesce(cwd, '') IN (SELECT value FROM json_each(?))")
      values.push(JSON.stringify(cwds))
    }
    const read = (predicate: string, value: string): MetadataMatches => {
      const rows = this.db
        .prepare(
          `SELECT ${this.columns} FROM sessions WHERE ${[...conditions, predicate].join(' AND ')}
           ORDER BY updated_at DESC, id DESC LIMIT ?`
        )
        .iterate(...values, value, scanLimit)
      const sessions: SessionRow[] = []
      let scanned = 0
      for (const row of rows) {
        // oxlint-disable-next-line typescript/consistent-type-assertions -- SAFETY: Columns come from the sessions schema.
        const session = row as SessionRow
        scanned += 1
        if (scope.matchesOperators(session)) {
          sessions.push(session)
          if (sessions.length >= scope.candidateLimit) {
            break
          }
        }
      }
      return {
        sessions,
        incomplete: scanned >= scanLimit || sessions.length >= scope.candidateLimit
      }
    }
    if (terms.length === 1) {
      const exact = read('session_id = ? COLLATE NOCASE', terms[0]!)
      if (exact.sessions.length > 0 || exact.incomplete) {
        return exact
      }
    }
    return read('session_search_matches_title(title, ?) = 1', JSON.stringify(terms.map(foldTitle)))
  }
}

function foldTitle(title: string): string {
  return title.toLowerCase().normalize('NFC')
}
