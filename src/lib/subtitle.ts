export type SubtitleFormat = 'srt' | 'vtt' | 'ass'

export interface Cue { start: number; end: number; text: string }

function timeToMs(value: string) {
  const normalized = value.trim().replace(',', '.')
  const parts = normalized.split(':').map(Number)
  if (parts.some(Number.isNaN)) throw new Error(`无法识别时间：${value}`)
  const seconds = parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1]
  return Math.round(seconds * 1000)
}

function srtTime(ms: number) {
  const h = Math.floor(ms / 3600000); const m = Math.floor(ms / 60000) % 60; const s = Math.floor(ms / 1000) % 60; const x = ms % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(x).padStart(3, '0')}`
}

function assTime(ms: number) {
  const h = Math.floor(ms / 3600000); const m = Math.floor(ms / 60000) % 60; const s = Math.floor(ms / 1000) % 60; const x = Math.floor((ms % 1000) / 10)
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(x).padStart(2, '0')}`
}

export function parseSubtitles(source: string, format: SubtitleFormat): Cue[] {
  const text = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  if (format === 'ass') {
    const cues = text.split('\n').filter(line => /^Dialogue:/i.test(line)).map(line => {
      const fields = line.replace(/^Dialogue:\s*/i, '').split(',')
      if (fields.length < 10) throw new Error('ASS Dialogue 行字段不足')
      return { start: timeToMs(fields[1]), end: timeToMs(fields[2]), text: fields.slice(9).join(',').replace(/\N/gi, '\n').replace(/\{[^}]*\}/g, '') }
    })
    if (!cues.length) throw new Error('没有找到 ASS/SSA 字幕行')
    return cues
  }
  const body = format === 'vtt' ? text.replace(/^WEBVTT[^\n]*\n+/, '') : text
  const cues: Cue[] = []
  for (const block of body.split(/\n{2,}/)) {
    const lines = block.trim().split('\n')
    const timingIndex = lines.findIndex(line => line.includes('-->'))
    if (timingIndex < 0) continue
    const [start, rawEnd] = lines[timingIndex].split('-->')
    cues.push({ start: timeToMs(start), end: timeToMs(rawEnd.trim().split(/\s+/)[0]), text: lines.slice(timingIndex + 1).join('\n') })
  }
  if (!cues.length) throw new Error('没有找到有效字幕时间轴')
  return cues
}

export function serializeSubtitles(cues: Cue[], format: SubtitleFormat, offsetMs = 0) {
  const shifted = cues.map(cue => ({ ...cue, start: Math.max(0, cue.start + offsetMs), end: Math.max(0, cue.end + offsetMs) }))
  if (format === 'srt') return shifted.map((cue, index) => `${index + 1}\n${srtTime(cue.start)} --> ${srtTime(cue.end)}\n${cue.text}`).join('\n\n') + '\n'
  if (format === 'vtt') return `WEBVTT\n\n${shifted.map(cue => `${srtTime(cue.start).replace(',', '.')} --> ${srtTime(cue.end).replace(',', '.')}\n${cue.text}`).join('\n\n')}\n`
  const header = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1920\nPlayResY: 1080\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H80000000,0,0,0,0,100,100,0,0,1,2,0,2,40,40,40,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`
  return header + shifted.map(cue => `Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},Default,,0,0,0,,${cue.text.replace(/\n/g, '\\N')}`).join('\n') + '\n'
}
