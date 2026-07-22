interface ContentBlock {
  type: string;
  text?: string;
}

// Conversation history also carries internal tool_use/tool_result turns (the
// plumbing behind book_appointment, share_pix_key, etc.) — those aren't
// meant for a human reader, so only the plain "text" blocks are surfaced here.
export function extractText(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  const text = (content as ContentBlock[])
    .filter((block) => block && block.type === "text" && typeof block.text === "string")
    .map((block) => block.text as string)
    .join("\n\n");
  return text.length > 0 ? text : null;
}
