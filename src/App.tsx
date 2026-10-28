import { Suspense, lazy, useEffect, useRef, useState } from 'react'
import { Link, Route, Routes, useLocation } from 'react-router-dom'
import { DropOverlay } from './components/DropOverlay'
import { ComponentManager } from './components/ComponentManager'
import { Icon } from './components/Icon'
import Home from './pages/Home'
import { allTools, conversionCategory, officeConversionCategory } from './tools'

const NotFound = lazy(() => import('./pages/NotFound'))

type Theme = 'light' | 'dark'

function initTheme(): Theme {
  const saved = localStorage.getItem('hahaimage.theme')
  if (saved === 'light' || saved === 'dark') return saved
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function ScrollReset() {
  const { pathname } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    window.scrollTo(0, 0)
    if (first.current) {
      first.current = false
      return
    }
    document.querySelector('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}

function RoutedContent() {
  const { pathname } = useLocation()
  return (
    <Suspense fallback={<Fallback />}>
      <div className="route-fade" key={pathname}>
        <Routes>
          <Route path="/" element={<Home view="home" />} />
          <Route path="/images" element={<Home view="image" />} />
          <Route path="/gifs" element={<Home view="gif" />} />
          <Route path="/pdfs" element={<Home view="pdf" />} />
          <Route path="/conversions" element={<Home view="convert" />} />
          {allTools.map(tool => <Route key={tool.path} path={tool.path} element={<tool.component />} />)}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </Suspense>
  )
}

function Fallback() {
  return <div className="suspense-fallback" role="status"><span className="spinner" />正在打开工具…</div>
}

function Sidebar({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const { pathname, state } = useLocation()
  const toolCategory = allTools.find(tool => tool.path === pathname)?.catId
  const sourceCategory = (state as { fromCategory?: string } | null)?.fromCategory
  const activeCategory = sourceCategory ?? toolCategory
  const isActive = (target: string) => {
    if (target === '/') return pathname === '/'
    const categoryByRoute: Record<string, string> = { '/images': 'image', '/gifs': 'gif', '/pdfs': 'pdf', '/conversions': 'convert' }
    const normalizedCategory = activeCategory === 'office-convert' ? 'convert' : activeCategory
    return pathname === target || normalizedCategory === categoryByRoute[target]
  }

  return (
    <aside className="app-sidebar" aria-label="主导航">
      <Link to="/" className="desktop-brand">
        <span className="desktop-brand-mark"><Icon name="image" size={22} /></span>
        <span><strong>MaxKit</strong><small>免费工具箱</small></span>
      </Link>
      <nav className="sidebar-nav">
        <Link to="/" className={isActive('/') ? 'is-active' : ''}><Icon name="home" size={19} /><span>首页</span></Link>
        <Link to="/images" className={isActive('/images') ? 'is-active' : ''}>
          <Icon name="image" size={19} /><span>图片工具</span><small>{allTools.filter(t => t.catId === 'image').length}</small>
        </Link>
        <Link to="/gifs" className={isActive('/gifs') ? 'is-active' : ''}>
          <Icon name="gif" size={19} /><span>GIF 工具</span><small>{allTools.filter(t => t.catId === 'gif').length}</small>
        </Link>
        <Link to="/pdfs" className={isActive('/pdfs') ? 'is-active' : ''}>
          <Icon name="pdf" size={19} /><span>PDF 工具</span><small>{allTools.filter(t => t.catId === 'pdf').length}</small>
        </Link>
        <Link to="/conversions" className={isActive('/conversions') ? 'is-active' : ''}>
          <Icon name="convert" size={19} /><span>格式转换</span><small>{conversionCategory.tools.length + officeConversionCategory.tools.length}</small>
        </Link>
      </nav>
      <div className="sidebar-spacer" />
      <div className="local-status"><span className="status-dot" /><span><strong>本地电脑处理</strong><small>文件不会上传</small></span></div>
      <ComponentManager />
      <button className="theme-toggle" onClick={onToggleTheme} aria-label={theme === 'dark' ? '切换到亮色模式' : '切换到暗色模式'}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />{theme === 'dark' ? '亮色模式' : '暗色模式'}
      </button>
      <div className="sidebar-version">MaxKit · v{__APP_VERSION__} 免费绿色版</div>
    </aside>
  )
}

export default function App() {
  const [theme, setTheme] = useState<Theme>(initTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('hahaimage.theme', theme)
  }, [theme])
  return (
    <div className="desktop-shell">
      <a href="#main-content" className="skip-link">跳到主要内容</a>
      <DropOverlay />
      <Sidebar theme={theme} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
      <main id="main-content" className="app-main" tabIndex={-1} style={{ outline: 'none' }}><ScrollReset /><RoutedContent /></main>
    </div>
  )
}
