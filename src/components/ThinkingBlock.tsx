// Reasoning summary: italic, muted, on the content column. No header, no icon
// — the tone is the whole identity (same rule as image-playground's transcript).
// Thought summaries arrive as light markdown (bold headings). The block is
// italic prose, so emphasis markers are dropped rather than rendered.
function plainThought(text: string): string {
  return text
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/__([^_\n]+)__/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function ThinkingBlock({ text }: { text: string }) {
  return (
    <div className="chat-item-enter flex justify-start">
      <div className="scroll-fade-y mr-3 max-h-[280px] min-w-0 max-w-[72ch] overflow-y-auto pl-[var(--agent-row-gutter)] text-sm leading-[1.55] whitespace-pre-wrap text-(--agent-thinking-text) italic [--scroll-fade-b-size:1rem] [--scroll-fade-t-size:0.75rem]">
        <div style={{ fontSynthesis: 'style' }}>{plainThought(text)}</div>
      </div>
    </div>
  )
}
