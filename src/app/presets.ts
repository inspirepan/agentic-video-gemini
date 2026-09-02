export type VideoPreset = {
  videoId: string
  title: string
  note: string
}

// Public, long-form videos where agentic navigation pays off. Titles are
// refreshed from oEmbed once loaded; these are just the picker labels.
export const VIDEO_PRESETS: VideoPreset[] = [
  { videoId: '7Z5Vy9JBANs', title: 'Gemini · I/O 2026 Keynote', note: 'Google · 主题演讲，长视频' },
  { videoId: 'zjkBMFhNj_g', title: 'Intro to Large Language Models', note: 'Andrej Karpathy · 1 小时演讲' },
  { videoId: 'aircAruvnKk', title: 'But what is a neural network?', note: '3Blue1Brown · 19 分钟' },
  {
    videoId: '9hE5-98ZeCg',
    title: 'Building with Gemini 2.0: Multimodal live streaming',
    note: 'Google for Developers · 3 分钟',
  },
]

export const PROMPT_PRESETS: string[] = [
  '用五个要点总结这个视频，每个要点标出讨论它的时间戳。',
  '主题第一次被引入是在哪个时间点？引用当时说的话。',
  '列出视频里出现的每一张图表、幻灯片或示意图，以及它们出现的时间戳。',
]
