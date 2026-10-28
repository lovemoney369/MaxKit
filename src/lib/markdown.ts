const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>')
}

export function markdownToBody(markdown: string) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const output: string[] = []
  let inCode = false; let code: string[] = []; let list: 'ul' | 'ol' | null = null
  const closeList = () => { if (list) { output.push(`</${list}>`); list = null } }
  for (const line of lines) {
    if (line.startsWith('```')) {
      closeList()
      if (inCode) { output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`); code = [] }
      inCode = !inCode
      continue
    }
    if (inCode) { code.push(line); continue }
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) { closeList(); const level = heading[1].length; output.push(`<h${level}>${inline(heading[2])}</h${level}>`); continue }
    if (/^>\s?/.test(line)) { closeList(); output.push(`<blockquote>${inline(line.replace(/^>\s?/, ''))}</blockquote>`); continue }
    const bullet = line.match(/^[-*+]\s+(.+)$/); const numbered = line.match(/^\d+[.)]\s+(.+)$/)
    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'; if (list !== type) { closeList(); list = type; output.push(`<${type}>`) }
      output.push(`<li>${inline((bullet ?? numbered)![1])}</li>`); continue
    }
    closeList()
    if (/^---+$/.test(line.trim())) { output.push('<hr>'); continue }
    if (!line.trim()) { output.push(''); continue }
    output.push(`<p>${inline(line)}</p>`)
  }
  closeList()
  if (inCode) output.push(`<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`)
  return output.join('\n')
}

export function standaloneHtml(title: string, markdown: string) {
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:18mm}body{max-width:860px;margin:32px auto;padding:0 24px;color:#202124;font:16px/1.75 system-ui,"Microsoft YaHei",sans-serif}h1,h2,h3{line-height:1.3;margin-top:1.5em}pre{padding:16px;background:#f4f5f7;border-radius:8px;white-space:pre-wrap}code{font-family:Consolas,monospace;background:#f4f5f7;padding:.15em .35em;border-radius:4px}pre code{padding:0}blockquote{margin-left:0;padding-left:16px;border-left:4px solid #8c93a0;color:#59606b}img{max-width:100%}a{color:#1769aa}hr{border:0;border-top:1px solid #ddd}@media print{body{margin:0;max-width:none;padding:0}}</style></head><body>${markdownToBody(markdown)}</body></html>`
}
