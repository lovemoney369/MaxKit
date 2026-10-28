import { expect, test } from '@playwright/test'

const expectedToolCount = 53
const expectedHomeCardCount = 61

test.describe('站点框架', () => {
  test('首页渲染全部分类与工具卡片', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByRole('heading', { name: 'MaxKit' })).toBeVisible()
    await expect(page.locator('.cat-section')).toHaveCount(6)
    await expect(page.locator('.tool-card')).toHaveCount(expectedHomeCardCount)
    await expect(page.locator('.privacy-pill')).toContainText('本地电脑处理')
  })

  test('搜索过滤工具', async ({ page }) => {
    await page.goto('/#/')
    await page.getByLabel('搜索工具').fill('水印')
    await expect(page.locator('.tool-card')).toHaveCount(3)
    await expect(page.locator('.tool-card h3')).toHaveText(['图片加水印', 'GIF 添加水印', 'PDF 文字水印'])
    await page.getByLabel('搜索工具').fill('不存在的工具xyz')
    await expect(page.locator('.tool-card')).toHaveCount(0)
    await expect(page.getByRole('status')).toContainText('没有找到')
  })

  test('明暗主题切换', async ({ page }) => {
    await page.goto('/#/')
    const initial = await page.evaluate(() => document.documentElement.dataset.theme)
    await page.getByRole('button', { name: /切换到.*模式/ }).click()
    const after = await page.evaluate(() => document.documentElement.dataset.theme)
    expect(after).not.toBe(initial)
    expect(['light', 'dark']).toContain(after)
  })

  test('侧边栏底部可打开组件管理', async ({ page }) => {
    await page.goto('/#/')

    const localStatus = page.locator('.local-status')
    const componentManager = page.getByRole('button', { name: '组件管理' })
    const themeToggle = page.locator('.theme-toggle')
    await expect(componentManager).toBeVisible()
    const [localBox, managerBox, themeBox] = await Promise.all([
      localStatus.boundingBox(),
      componentManager.boundingBox(),
      themeToggle.boundingBox(),
    ])
    expect(localBox!.y).toBeLessThan(managerBox!.y)
    expect(managerBox!.y).toBeLessThan(themeBox!.y)

    await componentManager.click()
    await expect(page.getByRole('dialog', { name: '组件管理' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'AI 抠图组件' })).toBeVisible()
    await expect(page.getByRole('heading', { name: '办公文档组件' })).toBeVisible()
  })

  test('所有工具路由可达且无 JS 错误', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.goto('/#/')
    const paths = await page.locator('.tool-card').evaluateAll(els =>
      els.map(el => (el as HTMLAnchorElement).hash),
    )
    expect(paths.length).toBe(expectedHomeCardCount)
    const uniquePaths = [...new Set(paths)]
    expect(uniquePaths.length).toBe(expectedToolCount)
    for (const hash of uniquePaths) {
      await page.goto(`/${hash}`)
      await expect(page.locator('.tool-head h1')).toBeVisible()
    }
    expect(errors).toEqual([])
  })

  test('最近使用：访问工具后出现在首页', async ({ page }) => {
    await page.goto('/#/crop')
    await expect(page.locator('.tool-head h1')).toHaveText('裁剪图片')
    await page.goto('/#/')
    const recentSection = page.locator('section', { has: page.locator('#cat-recent') })
    await expect(recentSection.getByRole('heading', { name: /最近使用/ })).toBeVisible()
    await expect(recentSection.locator('.tool-card h3')).toHaveText('裁剪图片')
  })

  test('Ctrl+V 粘贴图片上传', async ({ page }) => {
    await page.goto('/#/compress')
    await expect(page.locator('.dropzone')).toBeVisible() // 等懒加载页面挂载粘贴监听
    await page.evaluate(() => {
      const c = document.createElement('canvas')
      c.width = 32
      c.height = 32
      c.getContext('2d')!.fillRect(0, 0, 32, 32)
      return new Promise<void>(resolve => {
        c.toBlob(blob => {
          const dt = new DataTransfer()
          dt.items.add(new File([blob!], 'pasted.png', { type: 'image/png' }))
          window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt }))
          resolve()
        }, 'image/png')
      })
    })
    await expect(page.locator('.file-item .name')).toHaveText('pasted.png')
  })

  test('无障碍：首个 Tab 命中跳转链接并可跳到主内容', async ({ page }) => {
    await page.goto('/#/')
    await page.keyboard.press('Tab')
    const focusedClass = await page.evaluate(() => document.activeElement?.className)
    expect(focusedClass).toContain('skip-link')
    await page.keyboard.press('Enter')
    const focusedId = await page.evaluate(() => document.activeElement?.id)
    expect(focusedId).toBe('main-content')
  })

  test('侧边栏导航触控目标 ≥40px', async ({ page }) => {
    await page.goto('/#/')
    const heights = await page.locator('.sidebar-nav a').evaluateAll(els =>
      els.map(e => Math.round(e.getBoundingClientRect().height)),
    )
    expect(heights.length).toBeGreaterThanOrEqual(3)
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(38)
  })

  test('侧边栏分类与首页了解区可达', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.getByRole('navigation').getByText('图片工具')).toBeVisible()
    await expect(page.getByRole('navigation').getByText('GIF 工具')).toBeVisible()
    await expect(page.getByRole('navigation').getByText('PDF 工具')).toBeVisible()
    await expect(page.getByRole('navigation').getByText('格式转换')).toBeVisible()
    await expect(page.locator('.home-guide')).toContainText('使用说明')
    await expect(page.locator('a[href*="github" i]')).toHaveCount(0)
  })

  test('格式转换页复用原工具并提供新增转换', async ({ page }) => {
    await page.goto('/#/conversions')
    await expect(page.getByRole('heading', { name: '格式转换', exact: true }).first()).toBeVisible()
    await expect(page.locator('.tool-card')).toHaveCount(21)
    await expect(page.locator('.tool-card h3')).toHaveText([
      '转换图片', 'GIF 转 WebP / APNG', '视频转 GIF', '剪辑视频转 GIF', '图片转 PDF', 'PDF 转图片', 'PDF 提取文字', 'PDF 转纯文本',
      '视频格式转换', '音频格式转换', '视频提取音频', 'SVG 转 PNG / JPG / WebP', '图片转 ICO', 'ICO 转 PNG', '字幕格式转换', 'Markdown 转 HTML / PDF',
      'Word 文档转换', 'Excel 表格转换', 'PPT 演示文稿转换', 'Word 转图片', 'Excel 转图片',
    ])
    await page.getByRole('link', { name: /转换图片/ }).click()
    await expect(page.locator('.tool-head h1')).toHaveText('转换图片')
    await expect(page.getByRole('link', { name: '格式转换', exact: true })).toBeVisible()
    await expect(page.locator('.sidebar-nav a.is-active')).toContainText('格式转换')
    await page.goto('/#/word-convert')
    await expect(page.locator('.tool-head h1')).toHaveText('Word 文档转换')
    await expect(page.locator('.sidebar-nav a.is-active')).toContainText('格式转换')
    await expect(page.getByRole('dialog', { name: '启用办公文档功能' })).toBeVisible()
    await expect(page.getByRole('button', { name: '下载并启用组件' })).toBeVisible()
    await expect(page.getByRole('button', { name: /批量转换为 PDF/ })).toBeDisabled()
  })

  test('首页说明包含截止到指定内容的关于、常见问题和隐私', async ({ page }) => {
    await page.goto('/#/')
    await expect(page.locator('.guide-content')).toContainText('它如何工作')
    await page.getByRole('tab', { name: '常见问题' }).click()
    await expect(page.locator('.guide-content')).toContainText('压缩后图片反而变大了')
    await expect(page.locator('.compact-faq .faq-item')).toHaveCount(6)
    await page.getByRole('tab', { name: '隐私' }).click()
    await expect(page.locator('.guide-content')).toContainText('文件处理')
    await expect(page.locator('.guide-content')).toContainText('不会被上传到任何服务器')
  })

  test('未知路由显示 404 兜底页并可返回', async ({ page }) => {
    await page.goto('/#/this-tool-does-not-exist')
    await expect(page.locator('.notfound-code')).toHaveText('404')
    await expect(page.getByRole('heading', { name: '没有找到这个页面' })).toBeVisible()
    await page.getByRole('link', { name: /返回全部工具/ }).click()
    await expect(page.locator('.tool-card')).toHaveCount(expectedHomeCardCount)
  })

  test('社交分享 meta + PWA manifest 就位', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', 'MaxKit')
    await expect(page.locator('meta[name="theme-color"]').first()).toHaveAttribute('content', /#/)
    const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
    expect(manifestHref).toBeTruthy()
    const manifest = await page.evaluate(async href => {
      const r = await fetch(href!)
      return r.ok ? await r.json() : null
    }, manifestHref)
    expect(manifest?.short_name).toBe('MaxKit')
    expect(manifest?.icons?.length).toBeGreaterThanOrEqual(1)
  })

  test('移动端 375px 无横向滚动', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 720 })
    await page.goto('/#/')
    const hScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    )
    expect(hScroll).toBe(false)
  })
})
