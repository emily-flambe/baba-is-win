import { describe, it, expect } from 'vitest';
import { processSimpleMarkdown } from '../../src/utils/simpleMarkdown.js';

describe('Simple Markdown Processing', () => {
  it('should convert bold text', () => {
    const input = 'This is **bold** text';
    const output = processSimpleMarkdown(input);
    expect(output).toBe('This is <strong>bold</strong> text');
  });

  it('should convert italic text with single asterisks', () => {
    const input = 'This is *italic* text';
    const output = processSimpleMarkdown(input);
    expect(output).toBe('This is <em>italic</em> text');
  });

  it('should NOT convert underscores to italic (not implemented)', () => {
    const input = 'This is _not italic_ text';
    const output = processSimpleMarkdown(input);
    expect(output).toBe('This is _not italic_ text');
  });

  it('should convert inline code', () => {
    const input = 'Use the `console.log()` function';
    const output = processSimpleMarkdown(input);
    expect(output).toBe('Use the <code>console.log()</code> function');
  });

  it('should NOT convert bullet lists to HTML lists (just preserves with line breaks)', () => {
    const input = '* First item\n* Second item\n* Third item';
    const output = processSimpleMarkdown(input);

    // The simple markdown processor doesn't create lists, just adds <br> tags
    expect(output).toBe('* First item<br>* Second item<br>* Third item');
    expect(output).not.toContain('<ul>');
    expect(output).not.toContain('<em>');
  });

  it('should convert double line breaks to double br tags', () => {
    const input = 'First paragraph.\n\nSecond paragraph.';
    const output = processSimpleMarkdown(input);

    expect(output).toBe('First paragraph.<br><br>Second paragraph.');
  });

  it('should convert single line breaks to br tags', () => {
    const input = 'First line.\nSecond line.';
    const output = processSimpleMarkdown(input);

    expect(output).toBe('First line.<br>Second line.');
  });

  it('should handle complex mixed formatting', () => {
    const input = 'This has **bold**, *italic*, and `code`.';
    const output = processSimpleMarkdown(input);

    expect(output).toContain('<strong>bold</strong>');
    expect(output).toContain('<em>italic</em>');
    expect(output).toContain('<code>code</code>');
  });

  it('should not convert asterisks at the start of lines (list items)', () => {
    const input = '* List item\n* Another item';
    const output = processSimpleMarkdown(input);

    // Should NOT create italic tags for list items
    expect(output).not.toContain('<em>');
    expect(output).toBe('* List item<br>* Another item');
  });

  it('should handle empty input', () => {
    const input = '';
    const output = processSimpleMarkdown(input);
    expect(output).toBe('');
  });

  it('should handle null input', () => {
    const input = null;
    const output = processSimpleMarkdown(input);
    expect(output).toBe(null);
  });

  it('should NOT escape HTML tags (passes through as-is)', () => {
    const input = 'This is <script>alert("xss")</script> text';
    const output = processSimpleMarkdown(input);

    // The simple processor doesn't escape HTML
    expect(output).toBe('This is <script>alert("xss")</script> text');
  });

  it('should handle nested bold and italic', () => {
    const input = '**This is *bold and italic* text**';
    const output = processSimpleMarkdown(input);

    expect(output).toBe('<strong>This is <em>bold and italic</em> text</strong>');
  });

  it('should handle code blocks with special characters', () => {
    const input = 'Use `const x = { foo: "bar" }` in your code';
    const output = processSimpleMarkdown(input);

    expect(output).toBe('Use <code>const x = { foo: "bar" }</code> in your code');
  });
});