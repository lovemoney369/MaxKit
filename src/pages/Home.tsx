import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { getRecentPaths } from '../lib/recent'
import { useInView } from '../lib/useInView'
import { allTools, categories, type ToolDef } from '../tools'

type HomeView = 'home' | 'image' | 'gif' | 'pdf' | 'convert'
type InfoTab = 'about' | 'faq' | 'privacy'

const FAQS = [
  ['我的图片会被上传到服务器吗？', '不会。素材只在本地电脑中处理，自始至终不离开你的设备。'],
  ['需要注册或付费吗？', '都不需要。MaxKit 无需账号，也没有使用次数限制。'],
  ['处理大文件或大批量会卡吗？', '速度取决于电脑性能。超大图片、长视频或大量文件会占用更多内存与 CPU，建议分批处理。'],
  ['第一次用 GIF、视频或抠图工具为什么要等一会？', 'GIF 与视频会启动内置 FFmpeg；AI 抠图首次使用需要下载约 54MB 的本地组件，下载一次后即可离线使用。'],
  ['支持哪些格式？', '图片支持 PNG、JPG、WebP、BMP、SVG 等；动图支持 GIF、动态 WebP、APNG；视频支持 MP4、WebM、MOV 等；音频支持 MP3、WAV、AAC、FLAC、OGG 等；并提供图片与 PDF 互转。'],
  ['压缩后图片反而变大了？', '本来就很小或已高度压缩的图片，重新编码可能略微变大。结果会如实显示体积变化，这种情况保留原图即可。'],
] as const

function ToolCard({ tool, catId, index }: { tool: ToolDef; catId: string; index: number }) {
  return <Link to={tool.path} state={{ fromCategory: catId }} className="tool-card" data-cat={catId} style={{ '--i': index } as React.CSSProperties}><span className="tool-icon"><Icon name={tool.icon} size={22} /></span><span><h3>{tool.name}</h3><p>{tool.desc}</p></span></Link>
}

function CategorySection({ id, name, tools, labelId }: { id: string; name: string; tools: ToolDef[]; labelId: string }) {
  const [ref, inView] = useInView<HTMLElement>()
  return <section ref={ref} className={`cat-section${inView ? ' is-revealed' : ''}`} data-cat={id} aria-labelledby={labelId}><h2 id={labelId}>{name}<span className="cat-count">{tools.length} 个工具</span></h2><div className="tool-grid">{tools.map((tool, i) => <ToolCard key={tool.path} tool={tool} catId={tool.catId ?? id} index={i} />)}</div></section>
}

function HomeGuide() {
  const [tab, setTab] = useState<InfoTab>('about')
  return (
    <section className="home-guide" aria-labelledby="guide-title">
      <div className="guide-head"><div><span className="section-kicker">使用说明</span><h2 id="guide-title">安心使用，快速上手</h2></div><div className="guide-tabs" role="tablist" aria-label="说明分类">{([['about', '关于'], ['faq', '常见问题'], ['privacy', '隐私']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'is-active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div></div>
      <div className="guide-content" role="tabpanel">
        {tab === 'about' && <div className="guide-columns">
          <article><h3>为什么做它</h3><p>许多在线工具需要先上传素材，处理慢且存在隐私顾虑。MaxKit 把处理能力放在你的电脑中，无需上传、排队或登录。</p></article>
          <article><h3>它能做什么</h3><p>内置 {allTools.length} 个工具，覆盖图片、GIF、PDF、视频与音频的转换处理，以及压缩、裁剪、水印和 AI 抠图。</p></article>
          <article><h3>它如何工作</h3><p>图片与 PDF 由本地文档引擎处理；GIF 与视频使用内置 FFmpeg；AI 抠图模型按需下载。组件准备完成后，断网也能处理。</p></article>
        </div>}
        {tab === 'faq' && <div className="faq-list compact-faq">{FAQS.map(([question, answer], index) => <details className="faq-item" key={question} open={index === 0}><summary>{question}</summary><p>{answer}</p></details>)}</div>}
        {tab === 'privacy' && <article className="privacy-summary"><span className="privacy-icon"><Icon name="shield" size={24} /></span><div><h3>文件处理</h3><p>你选择或拖入的文件都只在本地电脑的内存中处理，<strong>不会被上传到任何服务器</strong>，也不会发送给第三方。处理结果只在你点击“保存”后写入电脑，关闭软件后临时数据会从内存中清除。</p><small>主题、工具参数与最近使用记录仅保存在本机。桌面端首次使用 AI 或办公文档功能时，可主动下载所需组件。</small></div></article>}
      </div>
    </section>
  )
}

export default function Home({ view }: { view: HomeView }) {
  const [query, setQuery] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const recent = useMemo(() => getRecentPaths().map(p => allTools.find(t => t.path === p)).filter((t): t is ToolDef => t != null), [])
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const source = q ? categories : view === 'home' ? categories : categories.filter(cat => view === 'convert' ? cat.id === 'convert' || cat.id === 'office-convert' : cat.id === view)
    const seen = new Set<string>()
    return source.map(cat => ({ ...cat, tools: cat.tools.filter(tool => {
      if (q && !(tool.name.toLowerCase().includes(q) || tool.desc.toLowerCase().includes(q))) return false
      if (q && seen.has(tool.path)) return false
      if (q) seen.add(tool.path)
      return true
    }) })).filter(cat => cat.tools.length)
  }, [query, view])

  useEffect(() => {
    const title = view === 'image' ? '图片工具' : view === 'gif' ? 'GIF 工具' : view === 'pdf' ? 'PDF 工具' : view === 'convert' ? '格式转换' : '首页'
    document.title = `${title} - MaxKit`
  }, [view])
  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchRef.current?.focus() } }
    window.addEventListener('keydown', focusSearch)
    return () => window.removeEventListener('keydown', focusSearch)
  }, [])

  const heading = view === 'image' ? '图片工具' : view === 'gif' ? 'GIF 工具' : view === 'pdf' ? 'PDF 工具' : view === 'convert' ? '格式转换' : 'MaxKit'
  const subtitle = view === 'image'
    ? '转换、压缩、裁剪、拼接、水印和 AI 批量抠图，一站完成。'
    : view === 'gif'
      ? 'GIF 压缩、裁剪、拆帧、合并，以及视频剪辑转 GIF。'
      : view === 'pdf'
        ? '合并、拆分、转图片、裁剪、签名、水印和页码支持批量处理，全部在本地完成。'
        : view === 'convert'
          ? '汇总图片、GIF、视频、音频、PDF 与办公文档转换工具，原有功能直接复用。'
        : '简单、快速、真正离线的图片、GIF、PDF、视频与音频处理工作台。'

  return <div className="container workspace-page">
    <section className={`home-hero home-hero-${view}`}><div className="hero-copy"><span className="eyebrow">MaxKit · 免费本地创作工具</span><h1>{heading}</h1><p className="sub">{subtitle}</p><p className="privacy-pill"><Icon name="shield" size={16} />全部在本地电脑处理，素材不会上传</p></div><div className="hero-search-area"><div className="search-box"><Icon name="search" size={19} /><input ref={searchRef} type="search" className="search-input" placeholder="搜索压缩、抠图、PDF 合并…" aria-label="搜索工具" value={query} onChange={event => setQuery(event.target.value)} /><kbd>Ctrl K</kbd></div></div></section>
    {!query.trim() && view === 'home' && <HomeGuide />}
    {!query.trim() && view === 'home' && (recent.length ? <CategorySection id="recent" name="最近使用" tools={recent} labelId="cat-recent" /> : <section className="cat-section is-revealed" data-cat="recent" aria-labelledby="cat-recent"><h2 id="cat-recent">最近使用<span className="cat-count">0 个工具</span></h2><div className="recent-empty"><Icon name="home" size={18} />你打开过的工具会自动出现在这里</div></section>)}
    {filtered.length === 0 && <p className="msg msg-info" role="status">没有找到匹配「{query}」的工具，换个关键词试试。</p>}
    {filtered.map(cat => <CategorySection key={cat.id} id={cat.id} name={query ? `${cat.name} · 搜索结果` : cat.name} tools={cat.tools} labelId={`cat-${cat.id}`} />)}
  </div>
}
