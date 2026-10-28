import { type ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { recordRecent } from '../lib/recent'
import { allTools } from '../tools'
import { Icon } from './Icon'

export function ToolPage({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  const { pathname, state } = useLocation()
  const sourceCategory = (state as { fromCategory?: string } | null)?.fromCategory
  const catId = sourceCategory ?? allTools.find(t => t.path === pathname)?.catId ?? 'image'
  const category = {
    image: { path: '/images', label: '图片工具' },
    gif: { path: '/gifs', label: 'GIF 工具' },
    pdf: { path: '/pdfs', label: 'PDF 工具' },
    convert: { path: '/conversions', label: '格式转换' },
    'office-convert': { path: '/conversions', label: '格式转换' },
  }[catId] ?? { path: '/', label: '全部工具' }

  useEffect(() => {
    document.title = `${title} - MaxKit`
    recordRecent(pathname)
    return () => {
      document.title = 'MaxKit'
    }
  }, [title, pathname])

  return (
    <div className="container" data-cat={catId}>
      <header className="tool-head">
        <Link to={category.path} className="breadcrumb">
          <Icon name="back" size={16} />
          {category.label}
        </Link>
        <h1>{title}</h1>
        <p className="desc">{desc}</p>
      </header>
      <div className="tool-body">{children}</div>
    </div>
  )
}
