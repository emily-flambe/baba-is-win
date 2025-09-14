// Simple markdown replacements that don't create new elements
export function processSimpleMarkdown(text) {
  if (!text) return text;

  return text
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* -> <em>text</em>
    // Updated regex to avoid matching list items
    // Only match * when it's not at start of line or after newline
    .replace(/(?<!^|\n|[\*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\*])/gm, '<em>$1</em>')
    // Inline code: `text` -> <code>text</code>
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Line breaks: convert \n\n to <br><br>
    .replace(/\n\n/g, '<br><br>')
    // Single line breaks: convert \n to <br>
    .replace(/\n/g, '<br>');
}