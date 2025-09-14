// Simple markdown replacements that don't create new elements
export function processSimpleMarkdown(text) {
  if (!text) return text;

  return text
    // Bold: **text** -> <strong>text</strong>
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic: *text* -> <em>text</em>
    // Updated regex to avoid matching list items
    // Only match * when it's not at start of line or after newline
    /*
     * Regex for italic (*text*):
     *   (?<!^|\n|[\*])   - Negative lookbehind: ensures the * is not at the start of the line, after a newline, or after another *
     *   \*               - Match the opening *
     *   (?!\s)           - Negative lookahead: the * is not followed by whitespace
     *   ([^*\n]+?)       - Capture group: match one or more characters that are not * or newline (non-greedy)
     *   (?<!\s)          - Negative lookbehind: the captured text does not end with whitespace
     *   \*               - Match the closing *
     *   (?![\*])         - Negative lookahead: the closing * is not followed by another *
     * Flags: g (global), m (multiline)
     */
    .replace(/(?<!^|\n|[\*])\*(?!\s)([^*\n]+?)(?<!\s)\*(?![\*])/gm, '<em>$1</em>')
    // Inline code: `text` -> <code>text</code>
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Line breaks: convert \n\n to <br><br>
    .replace(/\n\n/g, '<br><br>')
    // Single line breaks: convert \n to <br>
    .replace(/\n/g, '<br>');
}