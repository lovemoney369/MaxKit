<p align="center"><img src="public/icon.svg" width="80" alt="MaxKit"></p>

<h1 align="center">MaxKit</h1>

<p align="center">免费的本地文件工具箱，让图片、GIF、PDF、办公文档和音视频处理更简单。</p>

<p align="center"><a href="../../releases/latest">下载 Windows 版</a> · <a href="#功能一览">功能一览</a> · <a href="#本地开发">本地开发</a> · <a href="../../issues">反馈问题</a></p>

MaxKit 将常用的文件处理工具集中在一个界面中。无需注册账号，素材在本机处理，支持批量操作、拖入文件、粘贴图片，以及处理结果预览和保存。

## 下载与使用

前往 [Releases](../../releases)，下载 **MaxKit-0.4.1.zip**，完整解压后运行 **MaxKit.exe**。发布文件适用于 Windows x64，不需要安装。

1. 将整个压缩包解压到有写入权限的文件夹。
2. 运行 MaxKit.exe，选择图片、GIF、PDF 或格式转换分类。
3. 添加文件、设置处理选项，完成后保存结果。

请勿直接在压缩包预览窗口中运行程序，也不要只复制其中的 EXE。设置、缓存和下载组件保存在程序旁的 data 文件夹。

## 功能一览

当前提供 **53 个独立工具**。“格式转换”同时汇总其他分类中的转换入口，数量不重复累加。

| 分类 | 主要功能 |
| --- | --- |
| 图片 | PNG/JPG/WebP 转换、压缩、压到指定大小、裁剪、拼接、缩放、文字/图片水印、旋转与翻转、马赛克、分割、EXIF |
| AI 图片 | 批量抠图、证件照换底色 |
| GIF | 压缩、裁剪、拆帧、合并、倒放、往返播放、速度与尺寸调整、水印、转 WebP/APNG、图片转 GIF |
| PDF | 合并、拆分、提取或删除页面、旋转、页码、水印、页面整理、插入图片/签名、裁剪、图片互转、提取文字与纯文本 |
| 办公文档 | Word、Excel、PPT 各自同类格式转换与导出 PDF；Word/Excel 按页转图片 |
| 音视频 | 视频转 GIF、按片段转 GIF、视频格式转换、音频格式转换、视频提取音频 |
| 其他转换 | SVG 转 PNG/JPG/WebP、图片转 ICO、ICO 转 PNG、字幕互转与时间轴偏移、Markdown 转 HTML/PDF |

### 批量与交互

- 多文件处理、进度提示、取消任务与结果打包保存，具体能力以工具页为准。
- 支持点击选择、拖入文件、全局拖入和 Ctrl+V 粘贴图片。
- 压缩等工具提供前后对比，水印工具支持预览。
- 首页搜索、最近使用、参数记忆、明暗主题和键盘操作。

### 按需组件

| 组件 | 用途 | 获取方式 |
| --- | --- | --- |
| FFmpeg | GIF、视频和音频处理 | 桌面构建内置，本地加载 |
| IMG.LY 模型与 ONNX 资源 | AI 抠图、证件照换底色 | 首次使用主动下载，约 54 MB |
| LibreOffice | 办公文档转换、Word/Excel 转图片 | 首次使用主动下载，约 349 MB；也可识别系统已有安装 |

左侧底部的“组件管理”可查看、下载、取消或删除按需组件。下载资源会校验 SHA-256；下载完成后，相关处理可以离线执行。

## 使用范围

- 办公文档转换依赖 Electron 桌面环境和 LibreOffice，Web 页面不提供本地办公引擎。
- 支持 Word、Excel、PPT 各自同类格式转换；不提供三者跨类型转换，也不提供 PDF 转 Office。
- PDF 提取文字只处理已有文字层，不包含扫描件 OCR。
- 特殊字体、复杂排版、宏或动画可能与原软件显示不同；处理加密或损坏文档可能失败。
- 性能取决于文件大小和电脑配置，超大文件建议分批处理。

## 本地开发

使用 Node.js 24 LTS 和 npm，最低 Node.js 22.12。

~~~bash
npm ci
npm run dev
~~~

构建和预览 Web 版：

~~~bash
npm run build
npm run preview
~~~

在 Windows x64 上自行构建 ZIP：

~~~powershell
npm run desktop:zip
~~~

输出到 release-maxkit-0.4.1。若 Electron 运行文件没有自动下载，执行 node node_modules/electron/install.js。

Web 构建产物为静态文件，使用相对路径和哈希路由，可部署到 GitHub Pages 或其他静态托管。仓库附带手动触发的 Pages 工作流。

## 网络与本地数据

- 桌面页面与 FFmpeg 从本地加载；组件经用户主动操作后从官方资源服务器下载。
- Web 版运行 AI 工具时加载 IMG.LY 官方模型，可在 public/site.config.json 的 ai.modelBaseUrl 中配置自托管资源。
- EXIF 中的地图链接只在用户主动点击时打开外部网页。
- 主题、工具参数和最近使用记录保存在本机。

## 验证

~~~bash
npx playwright install chromium
npm test
npm run test:network
~~~

测试覆盖图片、GIF、音视频、PDF、格式转换、页面导航和交互。资源加载测试遍历所有工具，检查同源静态资源和本地偏好存储。AI 实际推理测试需设置 RUN_AI=1 后运行 npm test -- tests/ai.spec.ts。

## 项目结构

~~~text
src/
  components/       通用界面、结果预览、组件管理
  pages/tools/      各类工具页面
  lib/              文件处理与本地状态
electron/           本地协议、办公引擎、组件下载
public/             静态资源与 AI 路径配置
scripts/            构建和资源准备
tests/              浏览器自动化验证
~~~

## 致谢与许可证

MaxKit 基于 [HahaImage](https://github.com/mm-gogogo/hahaimage) 修改，保留原项目 MIT 许可证与版权声明。

处理能力来自 React、Electron、ffmpeg.wasm、IMG.LY、ONNX Runtime、pdf-lib、PDF.js、exifr、JSZip、LibreOffice 等开源项目。第三方代码和模型保留各自许可证，IMG.LY 抠图库与模型使用 AGPL-3.0，不能仅用根目录 MIT 文件替代其许可证。

详见 [LICENSE](LICENSE) 和 [第三方组件说明](THIRD_PARTY_NOTICES.md)。反馈问题请附上系统版本、工具名称、操作步骤和错误信息；请勿在公开 issue 中上传含隐私的原始文件。
