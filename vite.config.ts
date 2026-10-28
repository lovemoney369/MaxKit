import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import packageJson from './package.json' with { type: 'json' }

// base 使用相对路径，便于部署到 GitHub Pages 或任意静态托管
export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  resolve: {
    // AI 组件提供 WASM 文件；主程序只保留约 46KB 的 CPU 装载器，不再打包 24MB JSEP WASM。
    alias: [
      { find: 'onnxruntime-web/webgpu', replacement: fileURLToPath(new URL('./src/lib/onnx-webgpu-disabled.ts', import.meta.url)) },
      { find: /^onnxruntime-web$/, replacement: fileURLToPath(new URL('./node_modules/onnxruntime-web/dist/ort.wasm.min.mjs', import.meta.url)) },
    ],
  },
  optimizeDeps: {
    // ffmpeg.wasm 自带 worker，不能被预打包
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
