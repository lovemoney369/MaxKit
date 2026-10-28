import { app, BrowserWindow, ipcMain, net, protocol, session, shell } from 'electron'
import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable, Transform } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { pathToFileURL } from 'node:url'
import { AI_CHUNKS, AI_COMPONENT, AI_RESOURCE_MAP } from './ai-component.mjs'

const APP_SCHEME = 'hahaimage'

protocol.registerSchemesAsPrivileged([
  {
    scheme: APP_SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
])

const portableRoot = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'))
const officeJobs = new Map()
const officeComponent = Object.freeze({
  version: '25.8.7',
  size: 366_170_112,
  url: 'https://download.documentfoundation.org/libreoffice/stable/25.8.7/win/x86_64/LibreOffice_25.8.7_Win_x86-64.msi',
  sha256: 'ecdb65e76f5e91dc198b8c8dce5b5d6e1eb12fea6023553e52b591afd10b619d',
})
let officeInstallPromise = null
let officeInstallAbort = null
let officeInstallerProcess = null
let aiInstallPromise = null
let aiInstallAbort = null
const officeTargets = {
  word: new Set(['pdf', 'docx', 'doc', 'odt', 'rtf', 'txt']),
  spreadsheet: new Set(['pdf', 'xlsx', 'xls', 'ods', 'csv']),
  presentation: new Set(['pdf', 'pptx', 'ppt', 'odp']),
}
const officeSources = {
  word: new Set(['docx', 'doc', 'odt', 'rtf', 'txt']),
  spreadsheet: new Set(['xlsx', 'xls', 'ods', 'csv']),
  presentation: new Set(['pptx', 'ppt', 'odp']),
}
const officeMimeTypes = {
  pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword', odt: 'application/vnd.oasis.opendocument.text', rtf: 'application/rtf', txt: 'text/plain',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', xls: 'application/vnd.ms-excel',
  ods: 'application/vnd.oasis.opendocument.spreadsheet', csv: 'text/csv',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', ppt: 'application/vnd.ms-powerpoint',
  odp: 'application/vnd.oasis.opendocument.presentation',
}

function resolveLibreOffice() {
  const bundledRoot = app.isPackaged ? process.resourcesPath : app.getAppPath()
  const configuredPath = process.env.LIBREOFFICE_PATH
  const candidates = [
    { executable: path.join(app.getPath('userData'), 'components', 'libreoffice', 'program', 'soffice.com'), label: `LibreOffice ${officeComponent.version}（已下载组件）`, managed: true },
    { executable: path.join(bundledRoot, app.isPackaged ? 'libreoffice' : 'vendor/libreoffice', 'program', 'soffice.com'), label: 'LibreOffice（随程序组件）', managed: false },
    { executable: path.join(portableRoot, 'libreoffice', 'program', 'soffice.com'), label: 'LibreOffice（外置组件）', managed: false },
    configuredPath && {
      executable: /soffice\.(?:com|exe)$/i.test(configuredPath) ? configuredPath : path.join(configuredPath, 'program', 'soffice.com'),
      label: 'LibreOffice（自定义路径）',
      managed: false,
    },
    process.env.ProgramW6432 && { executable: path.join(process.env.ProgramW6432, 'LibreOffice', 'program', 'soffice.com'), label: 'LibreOffice（系统安装）', managed: false },
    process.env.ProgramFiles && { executable: path.join(process.env.ProgramFiles, 'LibreOffice', 'program', 'soffice.com'), label: 'LibreOffice（系统安装）', managed: false },
    process.env['ProgramFiles(x86)'] && { executable: path.join(process.env['ProgramFiles(x86)'], 'LibreOffice', 'program', 'soffice.com'), label: 'LibreOffice（系统安装）', managed: false },
  ].filter(Boolean)

  const seen = new Set()
  return candidates.find(candidate => {
    const normalized = path.resolve(candidate.executable).toLowerCase()
    if (seen.has(normalized)) return false
    seen.add(normalized)
    return existsSync(candidate.executable)
  }) ?? null
}

function emitOfficeInstallProgress(sender, progress) {
  if (!sender.isDestroyed()) sender.send('office:install-progress', progress)
}

async function downloadOfficeInstaller(destination, sender) {
  officeInstallAbort = new AbortController()
  const response = await fetch(officeComponent.url, {
    redirect: 'follow',
    signal: officeInstallAbort.signal,
    headers: { 'user-agent': `MaxKit/${app.getVersion()} LibreOffice component downloader` },
  })
  if (!response.ok || !response.body) throw new Error(`组件下载失败（HTTP ${response.status}）`)
  const total = Number(response.headers.get('content-length')) || officeComponent.size
  if (total < 100_000_000 || total > 500_000_000) throw new Error('组件文件大小异常，已停止下载')

  let received = 0
  let lastReported = 0
  const hash = createHash('sha256')
  const tracker = new Transform({
    transform(chunk, _encoding, callback) {
      received += chunk.length
      hash.update(chunk)
      const now = Date.now()
      if (now - lastReported >= 200 || received === total) {
        lastReported = now
        emitOfficeInstallProgress(sender, {
          stage: 'downloading',
          received,
          total,
          percent: Math.min(100, Math.round(received / total * 100)),
          message: '正在下载办公文档组件…',
        })
      }
      callback(null, chunk)
    },
  })
  await pipeline(Readable.fromWeb(response.body), tracker, createWriteStream(destination))
  const digest = hash.digest('hex')
  if (digest !== officeComponent.sha256) throw new Error('组件校验失败，下载文件可能不完整')
}

function runOfficeInstaller(msiPath, targetDirectory, sender) {
  return new Promise((resolve, reject) => {
    emitOfficeInstallProgress(sender, { stage: 'installing', received: officeComponent.size, total: officeComponent.size, percent: 100, message: '正在自动解包组件，请稍候…' })
    const child = spawn('msiexec.exe', ['/a', msiPath, '/qn', `TARGETDIR=${targetDirectory}`], { windowsHide: true })
    officeInstallerProcess = child
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      officeInstallerProcess = null
      callback(value)
    }
    const timer = setTimeout(() => {
      child.kill()
      finish(reject, new Error('组件解包超时，请检查磁盘空间后重试'))
    }, 15 * 60_000)
    child.on('error', error => finish(reject, error))
    child.on('close', code => {
      if (code === 0 || code === 3010) finish(resolve)
      else finish(reject, new Error(`组件解包失败（Windows Installer ${code ?? '未知错误'}）`))
    })
  })
}

async function findSoffice(root, depth = 0) {
  if (depth > 6) return null
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const candidate = path.join(root, entry.name)
    if (entry.isFile() && entry.name.toLowerCase() === 'soffice.com') return candidate
    if (entry.isDirectory()) {
      const found = await findSoffice(candidate, depth + 1)
      if (found) return found
    }
  }
  return null
}

async function installOfficeComponent(sender) {
  const existing = resolveLibreOffice()
  if (existing) return { available: true, version: existing.label }
  const componentParent = path.join(app.getPath('userData'), 'components')
  const componentRoot = path.join(componentParent, 'libreoffice')
  const jobRoot = path.join(componentParent, '.libreoffice-install')
  const installerPath = path.join(jobRoot, `LibreOffice-${officeComponent.version}.msi`)
  const extractedPath = path.join(jobRoot, 'extracted')
  await rm(jobRoot, { recursive: true, force: true })
  await mkdir(jobRoot, { recursive: true })
  try {
    emitOfficeInstallProgress(sender, { stage: 'downloading', received: 0, total: officeComponent.size, percent: 0, message: '正在连接 LibreOffice 官方下载服务器…' })
    await downloadOfficeInstaller(installerPath, sender)
    emitOfficeInstallProgress(sender, { stage: 'verifying', received: officeComponent.size, total: officeComponent.size, percent: 100, message: '下载完成，安全校验已通过' })
    await mkdir(extractedPath, { recursive: true })
    await runOfficeInstaller(installerPath, extractedPath, sender)
    const sofficePath = await findSoffice(extractedPath)
    if (!sofficePath) throw new Error('组件解包完成，但未找到办公文档引擎')
    const extractedRoot = path.dirname(path.dirname(sofficePath))
    await rm(componentRoot, { recursive: true, force: true })
    await cp(extractedRoot, componentRoot, { recursive: true })
    if (!existsSync(path.join(componentRoot, 'program', 'soffice.com'))) throw new Error('组件目录校验失败')
    await writeFile(path.join(componentRoot, 'maxkit-component.json'), JSON.stringify({
      name: 'LibreOffice',
      version: officeComponent.version,
      source: officeComponent.url,
      installedAt: new Date().toISOString(),
    }, null, 2))
    const status = { available: true, version: `LibreOffice ${officeComponent.version}（已下载组件）` }
    emitOfficeInstallProgress(sender, { stage: 'ready', received: officeComponent.size, total: officeComponent.size, percent: 100, message: '办公文档组件已就绪' })
    return status
  } catch (error) {
    const cancelled = officeInstallAbort?.signal.aborted
    const message = cancelled ? '组件下载已取消' : (error instanceof Error ? error.message : String(error))
    emitOfficeInstallProgress(sender, { stage: cancelled ? 'cancelled' : 'error', received: 0, total: officeComponent.size, percent: 0, message })
    throw new Error(message)
  } finally {
    officeInstallAbort = null
    officeInstallerProcess = null
    await rm(jobRoot, { recursive: true, force: true }).catch(() => {})
  }
}

function runOffice(jobId, args) {
  return new Promise((resolve, reject) => {
    const engine = resolveLibreOffice()
    if (!engine) {
      reject(new Error('尚未安装办公文档组件，请在左侧底部打开“组件管理”下载；也可以使用电脑中已安装的 LibreOffice 64 位版'))
      return
    }
    const child = spawn(engine.executable, args, { windowsHide: true })
    officeJobs.set(jobId, child)
    let output = ''
    let settled = false
    const finish = (callback, value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      officeJobs.delete(jobId)
      callback(value)
    }
    child.stdout.on('data', chunk => { output += chunk.toString() })
    child.stderr.on('data', chunk => { output += chunk.toString() })
    const timer = setTimeout(() => {
      child.kill()
      finish(reject, new Error('办公文档转换超时，请检查文件是否损坏或被加密'))
    }, 5 * 60_000)
    child.on('error', error => finish(reject, error))
    child.on('close', code => {
      if (code === 0) finish(resolve, output)
      else finish(reject, new Error(code == null ? '办公文档转换已取消' : `LibreOffice 转换失败（${code}）：${output.trim()}`))
    })
  })
}

function registerOfficeIpc() {
  ipcMain.handle('office:status', () => {
    const engine = resolveLibreOffice()
    return {
      available: Boolean(engine),
      version: engine?.label ?? '',
      managed: Boolean(engine?.managed),
      installing: Boolean(officeInstallPromise),
      download: { version: officeComponent.version, size: officeComponent.size },
    }
  })
  ipcMain.handle('office:install', event => {
    if (!officeInstallPromise) {
      officeInstallPromise = installOfficeComponent(event.sender).finally(() => { officeInstallPromise = null })
    }
    return officeInstallPromise
  })
  ipcMain.handle('office:install-cancel', () => {
    officeInstallAbort?.abort()
    officeInstallerProcess?.kill()
    return { cancelled: Boolean(officeInstallAbort || officeInstallerProcess) }
  })
  ipcMain.handle('office:remove', async () => {
    if (officeInstallPromise) throw new Error('组件正在安装，请先取消下载')
    await rm(path.join(app.getPath('userData'), 'components', 'libreoffice'), { recursive: true, force: true })
    const engine = resolveLibreOffice()
    return { available: Boolean(engine), version: engine?.label ?? '', managed: Boolean(engine?.managed) }
  })
  ipcMain.handle('office:convert', async (_event, payload) => {
    const { jobId, kind, name, target } = payload ?? {}
    const data = payload?.data
    if (typeof jobId !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(jobId)) throw new Error('任务编号无效')
    if (!(kind in officeSources) || !officeTargets[kind].has(target)) throw new Error('不支持的目标格式')
    const safeName = path.basename(String(name ?? '')).replace(/[^\p{L}\p{N}._ -]/gu, '_')
    if (!safeName || safeName === '.' || safeName === '..') throw new Error('文件名无效')
    const sourceExt = path.extname(safeName).slice(1).toLowerCase()
    if (!officeSources[kind].has(sourceExt)) throw new Error('输入格式与工具类型不匹配')
    if (sourceExt === target) throw new Error('源格式和目标格式相同，无需转换')
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data ?? [])
    if (!bytes.byteLength || bytes.byteLength > 200 * 1024 * 1024) throw new Error('文件为空或超过 200MB 限制')

    const jobRoot = path.join(app.getPath('temp'), `hahaimage-office-${jobId}`)
    const inputDir = path.join(jobRoot, 'input')
    const outputDir = path.join(jobRoot, 'output')
    const profileDir = path.join(jobRoot, 'profile')
    const inputPath = path.join(inputDir, safeName)
    const outputName = `${path.basename(safeName, path.extname(safeName))}.${target}`
    const outputPath = path.join(outputDir, outputName)
    try {
      await mkdir(inputDir, { recursive: true })
      await mkdir(outputDir, { recursive: true })
      await writeFile(inputPath, bytes)
      await runOffice(jobId, [
        '--headless', '--nologo', '--nodefault', '--nofirststartwizard',
        `-env:UserInstallation=${pathToFileURL(profileDir).href}`,
        '--convert-to', target,
        '--outdir', outputDir,
        inputPath,
      ])
      const result = await readFile(outputPath)
      return { name: outputName, data: result, type: officeMimeTypes[target] ?? 'application/octet-stream' }
    } finally {
      await rm(jobRoot, { recursive: true, force: true }).catch(() => {})
    }
  })
  ipcMain.handle('office:cancel', (_event, jobId) => {
    const child = officeJobs.get(jobId)
    if (child) child.kill()
    return { cancelled: Boolean(child) }
  })
  ipcMain.handle('document:html-to-pdf', async (_event, payload) => {
    const { jobId, html } = payload ?? {}
    if (typeof jobId !== 'string' || !/^[a-z0-9-]{8,80}$/i.test(jobId)) throw new Error('任务编号无效')
    if (typeof html !== 'string' || !html.trim() || Buffer.byteLength(html, 'utf8') > 10 * 1024 * 1024) {
      throw new Error('HTML 内容为空或超过 10MB 限制')
    }
    const jobRoot = path.join(app.getPath('temp'), `hahaimage-html-${jobId}`)
    const htmlPath = path.join(jobRoot, 'document.html')
    let printWindow
    try {
      await mkdir(jobRoot, { recursive: true })
      await writeFile(htmlPath, html, 'utf8')
      printWindow = new BrowserWindow({
        show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, javascript: false },
      })
      await printWindow.loadFile(htmlPath)
      const result = await printWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true })
      return { data: result, type: 'application/pdf' }
    } finally {
      if (printWindow && !printWindow.isDestroyed()) printWindow.destroy()
      await rm(jobRoot, { recursive: true, force: true }).catch(() => {})
    }
  })
}

function aiComponentRoot() {
  return path.join(app.getPath('userData'), 'components', 'imgly')
}

function aiComponentStatus() {
  const root = aiComponentRoot()
  const ready = existsSync(path.join(root, 'maxkit-component.json'))
    && existsSync(path.join(root, 'dist', 'resources.json'))
    && AI_CHUNKS.every(chunk => existsSync(path.join(root, 'dist', chunk.name)))
  return {
    available: ready,
    version: ready ? `IMG.LY AI 抠图 ${AI_COMPONENT.version}` : '',
    managed: ready,
    installing: Boolean(aiInstallPromise),
    publicPath: ready ? `${APP_SCHEME}://app/_components/imgly/` : '',
    download: { version: AI_COMPONENT.version, size: AI_COMPONENT.size },
  }
}

function emitAiInstallProgress(sender, progress) {
  if (!sender.isDestroyed()) sender.send('ai:install-progress', progress)
}

async function downloadAiChunk(chunk, destination, sender, completedBytes) {
  const response = await fetch(`${AI_COMPONENT.baseUrl}${chunk.name}`, {
    redirect: 'follow',
    signal: aiInstallAbort.signal,
    headers: { 'user-agent': `MaxKit/${app.getVersion()} AI component downloader` },
  })
  if (!response.ok || !response.body) throw new Error(`AI 组件下载失败（HTTP ${response.status}）`)
  const headerSize = Number(response.headers.get('content-length'))
  if (headerSize && headerSize !== chunk.size) throw new Error(`AI 组件文件大小异常：${chunk.name.slice(0, 12)}`)

  let received = 0
  let lastReported = 0
  const hash = createHash('sha256')
  const tracker = new Transform({
    transform(data, _encoding, callback) {
      received += data.length
      hash.update(data)
      const now = Date.now()
      if (now - lastReported >= 160 || received === chunk.size) {
        lastReported = now
        const totalReceived = completedBytes + received
        emitAiInstallProgress(sender, {
          stage: 'downloading',
          received: totalReceived,
          total: AI_COMPONENT.size,
          percent: Math.min(100, Math.round(totalReceived / AI_COMPONENT.size * 100)),
          message: '正在下载 AI 抠图组件…',
        })
      }
      callback(null, data)
    },
  })
  await pipeline(Readable.fromWeb(response.body), tracker, createWriteStream(destination))
  if (received !== chunk.size || hash.digest('hex') !== chunk.hash) {
    throw new Error(`AI 组件校验失败：${chunk.name.slice(0, 12)}`)
  }
}

async function installAiComponent(sender) {
  if (aiComponentStatus().available) return aiComponentStatus()
  const componentParent = path.join(app.getPath('userData'), 'components')
  const componentRoot = aiComponentRoot()
  const jobRoot = path.join(componentParent, '.imgly-install')
  const stagingRoot = path.join(jobRoot, 'component')
  const stagingDist = path.join(stagingRoot, 'dist')
  await rm(jobRoot, { recursive: true, force: true })
  await mkdir(stagingDist, { recursive: true })
  aiInstallAbort = new AbortController()
  try {
    emitAiInstallProgress(sender, { stage: 'downloading', received: 0, total: AI_COMPONENT.size, percent: 0, message: '正在连接 IMG.LY 官方资源服务器…' })
    let completedBytes = 0
    for (const chunk of AI_CHUNKS) {
      await downloadAiChunk(chunk, path.join(stagingDist, chunk.name), sender, completedBytes)
      completedBytes += chunk.size
    }
    emitAiInstallProgress(sender, { stage: 'verifying', received: AI_COMPONENT.size, total: AI_COMPONENT.size, percent: 100, message: '下载完成，所有文件校验已通过' })
    await writeFile(path.join(stagingDist, 'resources.json'), `${JSON.stringify(AI_RESOURCE_MAP, null, 2)}\n`)
    await writeFile(path.join(stagingRoot, 'maxkit-component.json'), JSON.stringify({
      name: 'IMG.LY AI Background Removal',
      version: AI_COMPONENT.version,
      source: AI_COMPONENT.baseUrl,
      installedAt: new Date().toISOString(),
    }, null, 2))
    await rm(componentRoot, { recursive: true, force: true })
    await cp(stagingRoot, componentRoot, { recursive: true })
    const status = aiComponentStatus()
    if (!status.available) throw new Error('AI 组件目录校验失败')
    emitAiInstallProgress(sender, { stage: 'ready', received: AI_COMPONENT.size, total: AI_COMPONENT.size, percent: 100, message: 'AI 抠图组件已就绪' })
    return status
  } catch (error) {
    const cancelled = aiInstallAbort?.signal.aborted
    const message = cancelled ? '组件下载已取消' : (error instanceof Error ? error.message : String(error))
    emitAiInstallProgress(sender, { stage: cancelled ? 'cancelled' : 'error', received: 0, total: AI_COMPONENT.size, percent: 0, message })
    throw new Error(message)
  } finally {
    aiInstallAbort = null
    await rm(jobRoot, { recursive: true, force: true }).catch(() => {})
  }
}

function registerAiIpc() {
  ipcMain.handle('ai:status', () => aiComponentStatus())
  ipcMain.handle('ai:install', event => {
    if (!aiInstallPromise) aiInstallPromise = installAiComponent(event.sender).finally(() => { aiInstallPromise = null })
    return aiInstallPromise
  })
  ipcMain.handle('ai:install-cancel', () => {
    aiInstallAbort?.abort()
    return { cancelled: Boolean(aiInstallAbort) }
  })
  ipcMain.handle('ai:remove', async () => {
    if (aiInstallPromise) throw new Error('组件正在安装，请先取消下载')
    await rm(aiComponentRoot(), { recursive: true, force: true })
    return aiComponentStatus()
  })
}

function configurePortableData() {
  const dataDir = path.join(portableRoot, 'data')
  mkdirSync(dataDir, { recursive: true })
  app.setPath('userData', dataDir)
  app.setPath('sessionData', path.join(dataDir, 'session'))
  app.setPath('crashDumps', path.join(dataDir, 'crashDumps'))
}

configurePortableData()
app.commandLine.appendSwitch('disable-component-update')
app.commandLine.appendSwitch('disable-default-apps')

function isInside(root, candidate) {
  const normalizedRoot = `${path.resolve(root).toLowerCase()}${path.sep}`
  return path.resolve(candidate).toLowerCase().startsWith(normalizedRoot)
}

async function registerAppProtocol() {
  const webRoot = path.join(app.getAppPath(), 'dist')

  protocol.handle(APP_SCHEME, async request => {
    const url = new URL(request.url)
    const relativePath = decodeURIComponent(url.pathname).replace(/^\/+/, '') || 'index.html'
    if (relativePath.startsWith('_components/imgly/')) {
      const componentRoot = path.join(aiComponentRoot(), 'dist')
      const componentPath = path.resolve(componentRoot, relativePath.slice('_components/imgly/'.length))
      if (!isInside(componentRoot, componentPath) || !existsSync(componentPath)) return new Response('Not found', { status: 404 })
      const response = await net.fetch(pathToFileURL(componentPath).toString())
      const headers = new Headers(response.headers)
      headers.set('Cross-Origin-Resource-Policy', 'same-origin')
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
    }
    const filePath = path.resolve(webRoot, relativePath)

    if (!isInside(webRoot, filePath)) return new Response('Forbidden', { status: 403 })

    const response = await net.fetch(pathToFileURL(filePath).toString())
    const headers = new Headers(response.headers)
    headers.set('Cross-Origin-Opener-Policy', 'same-origin')
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp')
    headers.set('Cross-Origin-Resource-Policy', 'same-origin')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  })
}

function openExternal(url) {
  if (url.startsWith('https://') || url.startsWith('http://')) void shell.openExternal(url)
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 920,
    minHeight: 640,
    show: process.env.HAHAIMAGE_SMOKE !== '1',
    backgroundColor: '#fbfaf7',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(`${APP_SCHEME}://`)) {
      event.preventDefault()
      openExternal(url)
    }
  })

  void win.loadURL(`${APP_SCHEME}://app/index.html`)
}

app.whenReady().then(async () => {
  await registerAppProtocol()
  registerOfficeIpc()
  registerAiIpc()
  session.defaultSession.webRequest.onBeforeRequest(
    { urls: ['http://*/*', 'https://*/*'] },
    (_details, callback) => callback({ cancel: true }),
  )
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
