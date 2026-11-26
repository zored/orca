export function findNativeChatTldr(markdown: string): string | undefined {
  let fence: string | undefined
  for (const line of markdown.split(/\r?\n/)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line)
    if (marker) {
      if (!fence) {
        fence = marker[1]
      } else if (marker[1].startsWith(fence) && marker[2].trim() === '') {
        fence = undefined
      }
      continue
    }
    const prefix =
      !fence && /^ {0,3}(#{1,6}\s+)?(\*\*|__)?TL;?DR(?=$|[\s:]|\*\*|__)\s*:?\s*/i.exec(line)
    if (prefix) {
      const [matched, heading, emphasis] = prefix
      const rest = line.slice(matched.length)
      const closesPrefix = emphasis && rest.startsWith(emphasis)
      const summary = (
        closesPrefix ? rest.slice(emphasis.length).replace(/^\s*:/, '') : rest
      ).trim()
      if (summary) {
        return `${heading ?? ''}${closesPrefix ? '' : (emphasis ?? '')}${summary}`
      }
    }
  }
  return undefined
}
