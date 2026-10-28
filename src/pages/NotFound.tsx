import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'

export default function NotFound() {
  useEffect(() => {
    document.title = '页面不存在 - MaxKit'
    return () => {
      document.title = 'MaxKit'
    }
  }, [])

  return (
    <div className="container">
      <div className="notfound">
        <span className="notfound-code">404</span>
        <h1>没有找到这个页面</h1>
        <p>你访问的工具或页面不存在，可能链接已变动。</p>
        <Link to="/" className="btn btn-primary">
          <Icon name="back" size={16} />
          返回全部工具
        </Link>
      </div>
    </div>
  )
}
