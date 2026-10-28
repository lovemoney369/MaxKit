import { runFFmpeg } from './ffmpeg'
import { safeInputName } from './gif'
import { baseName } from './image'

export type VideoTarget = 'mp4' | 'webm' | 'mov'
export type AudioTarget = 'mp3' | 'wav' | 'm4a' | 'flac' | 'ogg'

export const VIDEO_TARGETS: { value: VideoTarget; label: string; mime: string }[] = [
  { value: 'mp4', label: 'MP4（兼容性最好）', mime: 'video/mp4' },
  { value: 'webm', label: 'WebM（网页体积更小）', mime: 'video/webm' },
  { value: 'mov', label: 'MOV', mime: 'video/quicktime' },
]

export const AUDIO_TARGETS: { value: AudioTarget; label: string; mime: string }[] = [
  { value: 'mp3', label: 'MP3（通用）', mime: 'audio/mpeg' },
  { value: 'wav', label: 'WAV（无损未压缩）', mime: 'audio/wav' },
  { value: 'm4a', label: 'AAC / M4A（体积较小）', mime: 'audio/mp4' },
  { value: 'flac', label: 'FLAC（无损压缩）', mime: 'audio/flac' },
  { value: 'ogg', label: 'OGG', mime: 'audio/ogg' },
]

function audioArgs(target: AudioTarget, bitrate: number): string[] {
  switch (target) {
    case 'mp3': return ['-vn', '-c:a', 'libmp3lame', '-b:a', `${bitrate}k`]
    case 'wav': return ['-vn', '-c:a', 'pcm_s16le']
    case 'm4a': return ['-vn', '-c:a', 'aac', '-b:a', `${bitrate}k`]
    case 'flac': return ['-vn', '-c:a', 'flac']
    case 'ogg': return ['-vn', '-c:a', 'libopus', '-b:a', `${bitrate}k`]
  }
}

function videoArgs(target: VideoTarget, height: number): string[] {
  const scale = height > 0 ? ['-vf', `scale=-2:${height}:flags=lanczos`] : []
  switch (target) {
    case 'mp4': return [...scale, '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-movflags', '+faststart']
    case 'webm': return [...scale, '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-c:a', 'libopus']
    case 'mov': return [...scale, '-c:v', 'mpeg4', '-q:v', '5', '-c:a', 'aac']
  }
}

type ProgressCallbacks = {
  onProgress?: (ratio: number) => void
  onStatus?: (message: string) => void
}

export async function convertVideo(file: File, target: VideoTarget, height: number, callbacks: ProgressCallbacks) {
  const inputName = safeInputName(file, 'mp4')
  const outputName = `output.${target}`
  const [output] = await runFFmpeg({
    inputs: [{ name: inputName, data: file }],
    args: ['-i', inputName, '-map', '0:v:0', '-map', '0:a?', ...videoArgs(target, height), outputName],
    outputs: [outputName],
    ...callbacks,
  })
  const profile = VIDEO_TARGETS.find(item => item.value === target)!
  return {
    name: `${baseName(file.name)}.${target}`,
    blob: new Blob([output.data as BlobPart], { type: profile.mime }),
  }
}

export async function convertAudio(file: File, target: AudioTarget, bitrate: number, callbacks: ProgressCallbacks) {
  const inputName = safeInputName(file, 'audio')
  const outputName = `output.${target}`
  const [output] = await runFFmpeg({
    inputs: [{ name: inputName, data: file }],
    args: ['-i', inputName, ...audioArgs(target, bitrate), outputName],
    outputs: [outputName],
    ...callbacks,
  })
  const profile = AUDIO_TARGETS.find(item => item.value === target)!
  return {
    name: `${baseName(file.name)}.${target}`,
    blob: new Blob([output.data as BlobPart], { type: profile.mime }),
  }
}
