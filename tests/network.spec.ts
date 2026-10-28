import { expect, test } from '@playwright/test'

test('启动、浏览所有工具和打开组件管理只读取本地站点资源', async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  const outbound: string[] = []
  const writes: string[] = []
  const errors: string[] = []

  page.on('pageerror', error => errors.push(error.message))
  await page.route('**/*', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.protocol === 'http:' || url.protocol === 'https:') {
      if (url.origin !== origin) {
        outbound.push(request.method() + ' ' + request.url())
        await route.abort()
        return
      }
      if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.method() + ' ' + request.url())
    }
    await route.continue()
  })

  await page.goto('/#/')
  await expect(page.getByRole('heading', { name: 'MaxKit', exact: true })).toBeVisible()
  const paths = await page.locator('.tool-card').evaluateAll(cards =>
    [...new Set(cards.map(card => (card as HTMLAnchorElement).hash))],
  )
  expect(paths.length).toBeGreaterThan(40)
  for (const hash of paths) {
    await page.goto('/' + hash)
    await expect(page.locator('.tool-head h1')).toBeVisible()
  }
  await page.goto('/#/')
  await page.getByRole('button', { name: '组件管理', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '组件管理' })).toBeVisible()
  await page.getByRole('button', { name: '关闭', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'MaxKit', exact: true })).toBeVisible()
  const unexpectedStorage = await page.evaluate(() =>
    Object.keys(localStorage).filter(key =>
      key !== 'hahaimage.theme' && key !== 'hahaimage.recent' && !key.startsWith('hahaimage.pref.'),
    ),
  )
  expect(outbound).toEqual([])
  expect(writes).toEqual([])
  expect(unexpectedStorage).toEqual([])
  expect(errors).toEqual([])
})
