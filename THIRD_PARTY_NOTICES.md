# 来源与第三方组件

MaxKit 基于 [HahaImage](https://github.com/mm-gogogo/hahaimage) 修改，原项目的 MIT 许可证与版权声明保留在 LICENSE。

本仓库中的第三方依赖、可下载模型及运行组件保留各自许可证，不能仅以项目根目录的 MIT 文件代替。依赖版本见 package-lock.json，许可证原文随 npm 包或组件发布。

| 组件 | 上游 |
| --- | --- |
| React | https://github.com/facebook/react |
| React Router | https://github.com/remix-run/react-router |
| Electron | https://github.com/electron/electron |
| ffmpeg.wasm | https://github.com/ffmpegwasm/ffmpeg.wasm |
| IMG.LY 抠图库与模型（AGPL-3.0） | https://github.com/imgly/background-removal-js |
| ONNX Runtime | https://github.com/microsoft/onnxruntime |
| pdf-lib | https://github.com/Hopding/pdf-lib |
| PDF.js | https://github.com/mozilla/pdf.js |
| JSZip | https://github.com/Stuk/jszip |
| exifr | https://github.com/MikeKovarik/exifr |
| LibreOffice（按需下载） | https://www.libreoffice.org/ |

AI 组件来自 staticimgly.com；LibreOffice 安装组件来自 download.documentfoundation.org。安装时会验证固定版本的 SHA-256。
构建配置保留了 IMG.LY、PDF.js 与原项目许可证的资源复制规则。Electron 与 LibreOffice 自身的许可证应随相应运行组件保留。
