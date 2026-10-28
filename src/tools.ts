import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { IconName } from './components/Icon'

export interface ToolDef {
  path: string
  name: string
  desc: string
  icon: IconName
  component: LazyExoticComponent<ComponentType>
  /** 所属分类 id，构建 allTools 时回填（用于"最近使用"的分类配色） */
  catId?: string
}

export interface ToolCategory {
  id: string
  name: string
  tools: ToolDef[]
}

/* 全部工具页按路由懒加载，首屏只包含首页与框架代码 */
const coreCategories: ToolCategory[] = [
  {
    id: 'image',
    name: '图片工具',
    tools: [
      {
        path: '/convert',
        name: '转换图片',
        desc: '在 PNG / JPG / WebP 之间互转，支持批量',
        icon: 'convert',
        component: lazy(() => import('./pages/tools/Convert')),
      },
      {
        path: '/stitch',
        name: '拼接图片',
        desc: '多张图片横向或纵向拼成长图',
        icon: 'stitch',
        component: lazy(() => import('./pages/tools/Stitch')),
      },
      {
        path: '/watermark',
        name: '图片加水印',
        desc: '文字或图片水印，支持平铺与批量',
        icon: 'watermark',
        component: lazy(() => import('./pages/tools/Watermark')),
      },
      {
        path: '/resize',
        name: '调整图片尺寸',
        desc: '按像素或百分比缩放，支持批量',
        icon: 'resize',
        component: lazy(() => import('./pages/tools/Resize')),
      },
      {
        path: '/crop',
        name: '裁剪图片',
        desc: '拖拽框选区域，支持常用比例',
        icon: 'crop',
        component: lazy(() => import('./pages/tools/Crop')),
      },
      {
        path: '/compress',
        name: '压缩图片',
        desc: '调节质量减小体积，支持批量',
        icon: 'compress',
        component: lazy(() => import('./pages/tools/Compress')),
      },
      {
        path: '/compress-exif',
        name: '压缩 JPG 并保留 EXIF',
        desc: '压缩同时保留拍摄信息与色彩配置',
        icon: 'exif',
        component: lazy(() => import('./pages/tools/CompressExif')),
      },
      {
        path: '/compress-to-size',
        name: '压缩到指定大小',
        desc: '自动调节质量，压到目标 KB 以内',
        icon: 'target',
        component: lazy(() => import('./pages/tools/CompressToSize')),
      },
      {
        path: '/exif',
        name: '读取 EXIF',
        desc: '查看拍摄参数、GPS 等元数据',
        icon: 'exif',
        component: lazy(() => import('./pages/tools/Exif')),
      },
      {
        path: '/remove-bg',
        name: '批量抠图',
        desc: 'AI 自动去除背景，本地运行不上传',
        icon: 'magic',
        component: lazy(() => import('./pages/tools/RemoveBg')),
      },
      {
        path: '/split',
        name: '分割图片',
        desc: '按行列切成九宫格或任意网格',
        icon: 'split',
        component: lazy(() => import('./pages/tools/Split')),
      },
      {
        path: '/image-transform',
        name: '图片旋转与翻转',
        desc: '批量旋转、水平或垂直翻转，并纠正照片方向',
        icon: 'reverse',
        component: lazy(() => import('./pages/tools/ImageTransform')),
      },
      {
        path: '/image-mosaic',
        name: '图片马赛克 / 模糊',
        desc: '拖拽选择隐私区域，添加马赛克或模糊效果',
        icon: 'target',
        component: lazy(() => import('./pages/tools/ImageMosaic')),
      },
      {
        path: '/id-photo-bg',
        name: '证件照换底色',
        desc: '本地 AI 抠图后更换白、蓝、红或自定义底色',
        icon: 'magic',
        component: lazy(() => import('./pages/tools/IdPhotoBackground')),
      },
    ],
  },
  {
    id: 'gif',
    name: 'GIF 工具',
    tools: [
      {
        path: '/gif-compress',
        name: 'GIF 压缩',
        desc: '降帧率、缩尺寸、减色减小体积',
        icon: 'compress',
        component: lazy(() => import('./pages/tools/GifCompress')),
      },
      {
        path: '/gif-crop',
        name: 'GIF 裁剪',
        desc: '框选区域裁剪动图画面',
        icon: 'crop',
        component: lazy(() => import('./pages/tools/GifCrop')),
      },
      {
        path: '/gif-extract',
        name: '提取 GIF 帧',
        desc: '把每一帧导出为 PNG 图片',
        icon: 'frames',
        component: lazy(() => import('./pages/tools/GifExtract')),
      },
      {
        path: '/gif-merge',
        name: 'GIF 合并',
        desc: '多个 GIF 首尾相接合成一个',
        icon: 'merge',
        component: lazy(() => import('./pages/tools/GifMerge')),
      },
      {
        path: '/gif-reverse',
        name: 'GIF 倒放',
        desc: '让动图倒着播放',
        icon: 'reverse',
        component: lazy(() => import('./pages/tools/GifReverse')),
      },
      {
        path: '/gif-convert',
        name: 'GIF 转 WebP / APNG',
        desc: '转成更小更清晰的动图格式',
        icon: 'webp',
        component: lazy(() => import('./pages/tools/GifConvert')),
      },
      {
        path: '/video-to-gif',
        name: '视频转 GIF',
        desc: '把 MP4 等视频转成 GIF 动图',
        icon: 'video',
        component: lazy(() => import('./pages/tools/VideoToGif')),
      },
      {
        path: '/video-clip-gif',
        name: '剪辑视频转 GIF',
        desc: '截取视频片段后转成 GIF',
        icon: 'scissors',
        component: lazy(() => import('./pages/tools/VideoClipGif')),
      },
      {
        path: '/images-to-gif',
        name: '多张图片转 GIF',
        desc: '按顺序把多张图片制作成循环 GIF 动图',
        icon: 'gif',
        component: lazy(() => import('./pages/tools/ImagesToGif')),
      },
      {
        path: '/gif-speed',
        name: 'GIF 调整速度',
        desc: '批量加速或减慢 GIF 动图播放速度',
        icon: 'reverse',
        component: lazy(() => import('./pages/tools/GifSpeed')),
      },
      {
        path: '/gif-resize',
        name: 'GIF 修改尺寸',
        desc: '批量按宽度或百分比缩放 GIF 动图',
        icon: 'resize',
        component: lazy(() => import('./pages/tools/GifResize')),
      },
      {
        path: '/gif-watermark',
        name: 'GIF 添加水印',
        desc: '批量给 GIF 添加文字水印，支持位置和透明度',
        icon: 'watermark',
        component: lazy(() => import('./pages/tools/GifWatermark')),
      },
      {
        path: '/gif-boomerang',
        name: 'GIF 往返播放',
        desc: '批量生成正放后倒放的循环 GIF 动图',
        icon: 'reverse',
        component: lazy(() => import('./pages/tools/GifBoomerang')),
      },
    ],
  },
  {
    id: 'pdf',
    name: 'PDF 工具',
    tools: [
      {
        path: '/pdf-merge',
        name: 'PDF 合并',
        desc: '按顺序把多个 PDF 合并成一个文件',
        icon: 'merge',
        component: lazy(() => import('./pages/tools/PdfMerge')),
      },
      {
        path: '/pdf-split',
        name: 'PDF 拆分与提取',
        desc: '批量按页码范围提取，或把页面分别保存',
        icon: 'split',
        component: lazy(() => import('./pages/tools/PdfSplit')),
      },
      {
        path: '/images-to-pdf',
        name: '图片转 PDF',
        desc: '多张图片按顺序生成一个 PDF 文件',
        icon: 'pdf',
        component: lazy(() => import('./pages/tools/ImagesToPdf')),
      },
      {
        path: '/pdf-delete-pages',
        name: 'PDF 删除页面',
        desc: '批量删除多个 PDF 中不需要的页面',
        icon: 'scissors',
        component: lazy(() => import('./pages/tools/PdfDeletePages')),
      },
      {
        path: '/pdf-rotate',
        name: 'PDF 页面旋转',
        desc: '批量旋转多个 PDF 的全部或指定页面',
        icon: 'reverse',
        component: lazy(() => import('./pages/tools/PdfRotate')),
      },
      {
        path: '/pdf-watermark',
        name: 'PDF 文字水印',
        desc: '批量添加支持中文的透明文字水印',
        icon: 'watermark',
        component: lazy(() => import('./pages/tools/PdfWatermark')),
      },
      {
        path: '/pdf-page-numbers',
        name: 'PDF 添加页码',
        desc: '批量在页面顶部或底部添加页码',
        icon: 'pdf',
        component: lazy(() => import('./pages/tools/PdfPageNumbers')),
      },
      {
        path: '/pdf-to-images',
        name: 'PDF 转图片',
        desc: '批量按页导出 PNG 或 JPG，支持高清输出',
        icon: 'image',
        component: lazy(() => import('./pages/tools/PdfToImages')),
      },
      {
        path: '/pdf-organize',
        name: 'PDF 页面整理',
        desc: '查看缩略图并排序、旋转或删除页面',
        icon: 'frames',
        component: lazy(() => import('./pages/tools/PdfOrganize')),
      },
      {
        path: '/pdf-insert-image',
        name: 'PDF 插入图片 / 签名',
        desc: '批量添加签名、印章、二维码或图片',
        icon: 'image',
        component: lazy(() => import('./pages/tools/PdfInsertImage')),
      },
      {
        path: '/pdf-crop-pages',
        name: 'PDF 页面裁剪',
        desc: '批量按毫米裁掉页面四周白边',
        icon: 'crop',
        component: lazy(() => import('./pages/tools/PdfCropPages')),
      },
      {
        path: '/pdf-extract-text',
        name: 'PDF 提取文字',
        desc: '批量提取指定页面文字，每页保存为 TXT',
        icon: 'pdf',
        component: lazy(() => import('./pages/tools/PdfExtractText')),
      },
      {
        path: '/pdf-to-text',
        name: 'PDF 转纯文本',
        desc: '批量整理 PDF 文字层并输出纯文本 TXT',
        icon: 'word',
        component: lazy(() => import('./pages/tools/PdfToText')),
      },
    ],
  },
]

const conversionAdditions: ToolDef[] = [
  {
    path: '/video-convert',
    name: '视频格式转换',
    desc: '在 MP4、WebM 和 MOV 之间转换视频格式',
    icon: 'video',
    component: lazy(() => import('./pages/tools/VideoConvert')),
  },
  {
    path: '/audio-convert',
    name: '音频格式转换',
    desc: '转换 MP3、WAV、AAC、FLAC 和 OGG 音频',
    icon: 'audio',
    component: lazy(() => import('./pages/tools/AudioConvert')),
  },
  {
    path: '/extract-audio',
    name: '视频提取音频',
    desc: '从视频中提取 MP3、WAV、AAC、FLAC 或 OGG',
    icon: 'audio',
    component: lazy(() => import('./pages/tools/ExtractAudio')),
  },
  {
    path: '/svg-convert',
    name: 'SVG 转 PNG / JPG / WebP',
    desc: '批量把 SVG 矢量图导出为常用图片格式',
    icon: 'webp',
    component: lazy(() => import('./pages/tools/SvgConvert')),
  },
  {
    path: '/images-to-ico',
    name: '图片转 ICO',
    desc: '生成包含 16–256px 多尺寸的 Windows 图标',
    icon: 'image',
    component: lazy(() => import('./pages/tools/ImagesToIco')),
  },
  {
    path: '/ico-to-png',
    name: 'ICO 转 PNG',
    desc: '批量提取 ICO 中包含的 PNG 图标尺寸',
    icon: 'image',
    component: lazy(() => import('./pages/tools/IcoToPng')),
  },
  {
    path: '/subtitle-convert',
    name: '字幕格式转换',
    desc: 'SRT、WebVTT、ASS、SSA 互转与时间轴偏移',
    icon: 'frames',
    component: lazy(() => import('./pages/tools/SubtitleConvert')),
  },
  {
    path: '/markdown-convert',
    name: 'Markdown 转 HTML / PDF',
    desc: '把 Markdown 批量生成独立网页或 PDF 文档',
    icon: 'word',
    component: lazy(() => import('./pages/tools/MarkdownConvert')),
  },
]

const coreToolByPath = new Map(coreCategories.flatMap(category => category.tools).map(tool => [tool.path, tool]))
const conversionPaths = ['/convert', '/gif-convert', '/video-to-gif', '/video-clip-gif', '/images-to-pdf', '/pdf-to-images', '/pdf-extract-text', '/pdf-to-text']

export const conversionCategory: ToolCategory = {
  id: 'convert',
  name: '格式转换',
  tools: [
    ...conversionPaths.map(path => coreToolByPath.get(path)).filter((tool): tool is ToolDef => tool != null),
    ...conversionAdditions,
  ],
}

export const officeConversionCategory: ToolCategory = {
  id: 'office-convert',
  name: '办公文档转换',
  tools: [
    {
      path: '/word-convert',
      name: 'Word 文档转换',
      desc: '批量转换 DOCX、DOC、ODT、RTF、TXT 或导出 PDF',
      icon: 'word',
      component: lazy(() => import('./pages/tools/WordConvert')),
    },
    {
      path: '/spreadsheet-convert',
      name: 'Excel 表格转换',
      desc: '批量转换 XLSX、XLS、ODS、CSV 或导出 PDF',
      icon: 'spreadsheet',
      component: lazy(() => import('./pages/tools/SpreadsheetConvert')),
    },
    {
      path: '/presentation-convert',
      name: 'PPT 演示文稿转换',
      desc: '批量转换 PPTX、PPT、ODP 或导出 PDF',
      icon: 'presentation',
      component: lazy(() => import('./pages/tools/PresentationConvert')),
    },
    {
      path: '/word-to-images',
      name: 'Word 转图片',
      desc: '批量把 Word 文档按页导出 PNG 或 JPG',
      icon: 'word',
      component: lazy(() => import('./pages/tools/WordToImages')),
    },
    {
      path: '/spreadsheet-to-images',
      name: 'Excel 转图片',
      desc: '批量把 Excel 表格按打印页面导出图片',
      icon: 'spreadsheet',
      component: lazy(() => import('./pages/tools/SpreadsheetToImages')),
    },
  ],
}

/**
 * “格式转换”只复用原工具定义和路由，不复制已有页面或处理逻辑。
 * 首页会展示这个聚合分类；allTools 则按路径去重，避免重复注册路由。
 */
export const categories: ToolCategory[] = [...coreCategories, conversionCategory, officeConversionCategory]

const uniqueTools = new Map<string, ToolDef>()
for (const category of categories) {
  for (const tool of category.tools) {
    if (!uniqueTools.has(tool.path)) uniqueTools.set(tool.path, { ...tool, catId: category.id })
  }
}
export const allTools: ToolDef[] = [...uniqueTools.values()]
