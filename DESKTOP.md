# Windows 桌面开发

使用 Node.js 24 LTS，在 Windows x64 中执行：

~~~powershell
npm ci
npm run build
npm run desktop:zip
~~~

若 Electron 运行文件缺失，执行 node node_modules/electron/install.js。
desktop:zip 自动准备精简的 Electron 运行目录并输出到 release-maxkit-0.4.1。语言包保留 zh-CN、zh-TW、en-US。

## 本地能力

通过 hahaimage:// 协议加载本地页面，开启 contextIsolation 和 sandbox。渲染进程外部 HTTP/HTTPS 子资源全部阻止；组件下载由主进程执行并校验 SHA-256。
FFmpeg 随构建准备；AI 模型、LibreOffice 经用户从组件管理主动下载。设置、组件和缓存保存在程序旁的 data 目录。

Web 开发执行 npm run dev。Electron 使用 dist 目录，修改源码后先 npm run build。

~~~powershell
npm run desktop:smoke
npm run desktop:pdf-smoke
~~~
