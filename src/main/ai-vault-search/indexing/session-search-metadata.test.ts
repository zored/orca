import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { expect, it } from 'vitest'
import { SessionSearchDirectoryListings } from '../discovery/session-search-directory-listings'
import { SessionSearchEngine } from '../query/session-search-engine'
import { SessionSearchStore } from '../storage/session-search-store'
import { registerSessionSearchIndexConsumer } from './session-search-index-consumer'
import { openSessionSearchIndexerHarness } from './session-search-indexer-test-fixture'
import { runSessionSearchPass } from './session-search-pass'
import {
  assistantRecord,
  CLAUDE_SESSION_ID,
  userRecord
} from './session-search-transcript-fixtures'

it('finds an indexed Claude session by identity and title alongside message matches', async () => {
  const harness = await openSessionSearchIndexerHarness('ss-metadata')
  await mkdir(dirname(harness.databasePath), { recursive: true })
  const store = new SessionSearchStore(harness.databasePath)
  const unregister = registerSessionSearchIndexConsumer(store)
  try {
    const profileProjects = join(harness.root, 'account', 'projects')
    const profileProject = join(profileProjects, 'project')
    const targetCwd = join(harness.root, 'target-repo')
    const decoyId = 'bbbbbbbb-aaaa-4ccc-8ddd-eeeeeeeeeeee'
    const emojiId = 'cccccccc-aaaa-4ccc-8ddd-eeeeeeeeeeee'
    const title = 'Синтетические Ошибки'
    await mkdir(profileProject, { recursive: true })
    await mkdir(harness.claudeProjectDir, { recursive: true })
    await writeFile(
      join(profileProject, `${CLAUDE_SESSION_ID}.jsonl`),
      [
        userRecord(0, 'Analyze the output', CLAUDE_SESSION_ID, targetCwd),
        assistantRecord(1, 'Checked the output'),
        JSON.stringify({ type: 'custom-title', sessionId: CLAUDE_SESSION_ID, customTitle: title }),
        ''
      ].join('\n')
    )
    await writeFile(
      join(harness.claudeProjectDir, `${decoyId}.jsonl`),
      [
        userRecord(2, `See ${CLAUDE_SESSION_ID}: синтетические ошибки`, decoyId, harness.root),
        JSON.stringify({ type: 'custom-title', sessionId: decoyId, customTitle: 'Reference' }),
        ''
      ].join('\n')
    )
    await writeFile(
      join(profileProject, `${emojiId}.jsonl`),
      [
        userRecord(3, 'Review the output', emojiId, targetCwd),
        JSON.stringify({ type: 'custom-title', sessionId: emojiId, customTitle: '🚧' }),
        ''
      ].join('\n')
    )
    await runSessionSearchPass({
      store,
      roots: { ...harness.roots, claudeProfileProjectsDirs: [profileProjects] },
      full: true,
      recentPerAgent: Number.POSITIVE_INFINITY,
      listings: new SessionSearchDirectoryListings()
    })

    const search = new SessionSearchEngine(store.connection)
    expect.soft(search.search({ query: CLAUDE_SESSION_ID.toUpperCase() }).hits).toMatchObject([
      { sessionId: CLAUDE_SESSION_ID, title, evidence: null },
      { sessionId: decoyId, evidence: { role: 'user' } }
    ])
    const query = 'синтетические ошибки'
    const first = search.search({ query, limit: 1 })
    expect.soft(first.hits).toMatchObject([{ sessionId: CLAUDE_SESSION_ID, title, evidence: null }])
    expect(first.page.cursor).toEqual(expect.any(String))
    expect(
      search.search({ query, limit: 1, cursor: first.page.cursor ?? undefined }).hits
    ).toMatchObject([{ sessionId: decoyId, evidence: { role: 'user' } }])
    expect
      .soft(search.search({ query, filters: { scopePaths: [targetCwd] } }).hits)
      .toMatchObject([{ sessionId: CLAUDE_SESSION_ID }])
    expect(
      search.search({ query: CLAUDE_SESSION_ID, filters: { agents: ['codex'] } }).hits
    ).toEqual([])
    for (const query of ['🚧', '🚧 path:target-repo']) {
      expect
        .soft(search.search({ query }).hits)
        .toMatchObject([{ sessionId: emojiId, title: '🚧', evidence: null }])
    }
    expect(search.search({ query: '🚧 path:not-on-this-machine' }).hits).toEqual([])
    expect(search.search({ query: '...' }).hits).toEqual([])
    expect(search.search({ query: 'path:target-repo' }).hits.map((hit) => hit.sessionId)).toEqual([
      emojiId,
      CLAUDE_SESSION_ID
    ])
  } finally {
    unregister()
    store.close()
    await harness.cleanup()
  }
})
