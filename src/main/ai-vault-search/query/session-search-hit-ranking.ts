import type { AiVaultAgent } from '../../../shared/ai-vault/contracts/ai-vault-types'
import { isCollapsibleContentHash } from '../storage/session-search-content-hash'
import type { SessionSearchSort } from './session-search-engine-types'

const LENGTH_PRIOR = 0.02

export type SessionRow = {
  id: number
  agent: AiVaultAgent
  session_id: string
  file_path: string
  codex_home: string | null
  title: string
  cwd: string | null
  branch: string | null
  updated_at: string | null
  message_count: number
  resume_command: string
  content_hash: string | null
  content_hash_count: number
}

export type MessageRow = {
  rowid: number
  score: number
  session_row_id: number
  role: string
  ts: string | null
}

export type RankedSession = {
  session: SessionRow
  /** Null for a metadata or operator match without matching messages. */
  message: MessageRow | null
  score: number
  duplicateCount: number
}

/** Rank and fold forks across the full candidate list before the engine slices cursor pages. */
export function rankSessionHits(
  sessions: readonly SessionRow[],
  matches: ReadonlyMap<number, MessageRow>,
  sort: SessionSearchSort,
  metadata: readonly SessionRow[] = []
): RankedSession[] {
  const metadataMatches = new Set(metadata.map((session) => session.id))
  const candidates = [
    ...sessions.filter((session) => !metadataMatches.has(session.id)),
    ...metadata
  ]
  const byMetadata = (left: RankedSession, right: RankedSession) =>
    Number(metadataMatches.has(right.session.id)) - Number(metadataMatches.has(left.session.id))
  const scored = collapseForks(
    candidates.map((session) => {
      const message = matches.get(session.id) ?? null
      return {
        session,
        message,
        score: (message?.score ?? 0) - LENGTH_PRIOR * Math.log(1 + session.message_count),
        duplicateCount: 1
      }
    }),
    byMetadata
  )
  // Newer sessions win score ties; row ids make cursor ordering deterministic.
  scored.sort(
    (left, right) =>
      (sort === 'newest' ? 0 : byMetadata(left, right) || right.score - left.score) ||
      (right.session.updated_at ?? '').localeCompare(left.session.updated_at ?? '') ||
      left.session.id - right.session.id
  )
  return scored
}

/** Fold matching prefixes at query time so per-file indexing cursors and deletion remain independent. */
function collapseForks(
  scored: RankedSession[],
  byMetadata: (left: RankedSession, right: RankedSession) => number
): RankedSession[] {
  const groups = new Map<string, RankedSession[]>()
  for (const entry of scored) {
    const { content_hash: hash, content_hash_count: count, id } = entry.session
    const key = isCollapsibleContentHash(hash, count) ? `hash:${hash}` : `session:${id}`
    const group = groups.get(key)
    if (group) {
      group.push(entry)
    } else {
      groups.set(key, [entry])
    }
  }
  const collapsed: RankedSession[] = []
  for (const group of groups.values()) {
    if (group.length === 1) {
      collapsed.push(group[0]!)
      continue
    }
    const winner = group.reduce((best, entry) => {
      const metadataOrder = byMetadata(entry, best)
      return metadataOrder < 0 || (metadataOrder === 0 && isNewer(entry, best)) ? entry : best
    })
    collapsed.push({ ...winner, duplicateCount: group.length })
  }
  return collapsed
}

function isNewer(entry: RankedSession, best: RankedSession): boolean {
  const order = (entry.session.updated_at ?? '').localeCompare(best.session.updated_at ?? '')
  return order === 0 ? entry.score > best.score : order > 0
}
