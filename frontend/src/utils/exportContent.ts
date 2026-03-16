import type {JSONContent} from '../types/page';
import type {Tag} from '../types/tag';

// ---------------------------------------------------------------------------
// TipTap JSON → Markdown
// ---------------------------------------------------------------------------

function inlineToMarkdown(node: JSONContent): string {
  if (node.type === 'hardBreak') return '  \n';
  if (node.type === 'image') {
    return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''})`;
  }
  if (node.type !== 'text') {
    return (node.content ?? []).map(inlineToMarkdown).join('');
  }

  let text = node.text ?? '';
  const marks = node.marks ?? [];

  // Code mark takes priority — no other marks inside code spans
  if (marks.some((m) => m.type === 'code')) return '`' + text + '`';

  const isBold = marks.some((m) => m.type === 'bold');
  const isItalic = marks.some((m) => m.type === 'italic');
  const isStrike = marks.some((m) => m.type === 'strike');
  const link = marks.find((m) => m.type === 'link');

  if (isStrike) text = `~~${text}~~`;
  if (isBold && isItalic) text = `***${text}***`;
  else if (isBold) text = `**${text}**`;
  else if (isItalic) text = `_${text}_`;
  if (link) text = `[${text}](${link.attrs?.href ?? ''})`;

  return text;
}

function nodeToMarkdown(node: JSONContent, indent = ''): string {
  const children = node.content ?? [];

  switch (node.type) {
    case 'doc':
      return children.map((n) => nodeToMarkdown(n)).join('\n\n').trim();

    case 'paragraph':
      if (!children.length) return '';
      return indent + children.map(inlineToMarkdown).join('');

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      return '#'.repeat(level) + ' ' + children.map(inlineToMarkdown).join('');
    }

    case 'bulletList':
      return children
        .map((item) => {
          const itemChildren = item.content ?? [];
          return itemChildren
            .map((n, i) =>
              i === 0
                ? `${indent}- ${n.content?.map(inlineToMarkdown).join('') ?? ''}`
                : nodeToMarkdown(n, indent + '  ')
            )
            .join('\n');
        })
        .join('\n');

    case 'orderedList':
      return children
        .map((item, idx) => {
          const itemChildren = item.content ?? [];
          return itemChildren
            .map((n, i) =>
              i === 0
                ? `${indent}${idx + 1}. ${n.content?.map(inlineToMarkdown).join('') ?? ''}`
                : nodeToMarkdown(n, indent + '   ')
            )
            .join('\n');
        })
        .join('\n');

    case 'blockquote':
      return children.map((n) => '> ' + nodeToMarkdown(n)).join('\n');

    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? '';
      const code = children.map((n) => n.text ?? '').join('');
      return '```' + lang + '\n' + code + '\n```';
    }

    case 'image':
      return `![${node.attrs?.alt ?? ''}](${node.attrs?.src ?? ''})`;

    case 'pdfBlock':
      return `> 📎 [${node.attrs?.filename ?? 'document.pdf'}](${node.attrs?.src ?? ''})`;

    case 'horizontalRule':
      return '---';

    case 'hardBreak':
      return '  \n';

    default:
      return children.map((n) => nodeToMarkdown(n, indent)).join('\n\n');
  }
}

export function pageToMarkdown(
  title: string,
  content: JSONContent | null,
  tags: Tag[]
): string {
  const lines: string[] = [`# ${title}`];
  if (tags.length > 0) {
    lines.push(`\ntags: ${tags.map((t) => t.name).join(', ')}`);
  }
  lines.push('');
  if (content) {
    lines.push(nodeToMarkdown(content));
  }
  return lines.join('\n');
}

export function allPagesToMarkdown(
  pages: Array<{title: string; content: JSONContent | null; tags: Tag[]}>
): string {
  return pages.map((p) => pageToMarkdown(p.title, p.content, p.tags)).join('\n\n---\n\n');
}

// ---------------------------------------------------------------------------
// TipTap JSON → HTML
// ---------------------------------------------------------------------------

function marksOpen(marks: Array<{type: string; attrs?: Record<string, unknown>}>): string {
  return marks
    .map((m) => {
      if (m.type === 'bold') return '<strong>';
      if (m.type === 'italic') return '<em>';
      if (m.type === 'strike') return '<s>';
      if (m.type === 'code') return '<code class="inline-code">';
      if (m.type === 'link') return `<a href="${m.attrs?.href ?? ''}" target="_blank" rel="noopener">`;
      return '';
    })
    .join('');
}

function marksClose(marks: Array<{type: string}>): string {
  return [...marks]
    .reverse()
    .map((m) => {
      if (m.type === 'bold') return '</strong>';
      if (m.type === 'italic') return '</em>';
      if (m.type === 'strike') return '</s>';
      if (m.type === 'code') return '</code>';
      if (m.type === 'link') return '</a>';
      return '';
    })
    .join('');
}

function inlineToHtml(node: JSONContent): string {
  if (node.type === 'hardBreak') return '<br>';
  if (node.type === 'image') {
    return `<img src="${node.attrs?.src ?? ''}" alt="${node.attrs?.alt ?? ''}" style="max-width:100%">`;
  }
  if (node.type !== 'text') {
    return (node.content ?? []).map(inlineToHtml).join('');
  }
  const marks = node.marks ?? [];
  const text = (node.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return marksOpen(marks) + text + marksClose(marks);
}

function nodeToHtml(node: JSONContent): string {
  const children = node.content ?? [];

  switch (node.type) {
    case 'doc':
      return children.map(nodeToHtml).join('\n');

    case 'paragraph':
      if (!children.length) return '<p></p>';
      return `<p>${children.map(inlineToHtml).join('')}</p>`;

    case 'heading': {
      const level = (node.attrs?.level as number) ?? 1;
      return `<h${level}>${children.map(inlineToHtml).join('')}</h${level}>`;
    }

    case 'bulletList':
      return `<ul>${children.map((item) => `<li>${(item.content ?? []).map(nodeToHtml).join('')}</li>`).join('\n')}</ul>`;

    case 'orderedList':
      return `<ol>${children.map((item) => `<li>${(item.content ?? []).map(nodeToHtml).join('')}</li>`).join('\n')}</ol>`;

    case 'blockquote':
      return `<blockquote>${children.map(nodeToHtml).join('\n')}</blockquote>`;

    case 'codeBlock': {
      const lang = (node.attrs?.language as string) ?? '';
      const code = children
        .map((n) => (n.text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .join('');
      return `<pre><code class="language-${lang}">${code}</code></pre>`;
    }

    case 'image':
      return `<img src="${node.attrs?.src ?? ''}" alt="${node.attrs?.alt ?? ''}" style="max-width:100%">`;

    case 'pdfBlock':
      return `<p>📎 <a href="${node.attrs?.src ?? ''}" target="_blank" rel="noopener">${node.attrs?.filename ?? 'document.pdf'}</a></p>`;

    case 'horizontalRule':
      return '<hr>';

    default:
      return children.map(nodeToHtml).join('\n');
  }
}

const HTML_STYLES = `
  body { font-family: system-ui, -apple-system, sans-serif; max-width: 720px; margin: 40px auto; padding: 0 24px; color: #111; line-height: 1.6; }
  h1 { font-size: 2rem; font-weight: 700; margin: 0 0 0.5rem; }
  h2 { font-size: 1.5rem; font-weight: 600; margin: 1.5rem 0 0.5rem; }
  h3 { font-size: 1.25rem; font-weight: 600; margin: 1.25rem 0 0.5rem; }
  p { margin: 0.75rem 0; }
  ul, ol { padding-left: 1.5rem; margin: 0.75rem 0; }
  li { margin: 0.25rem 0; }
  blockquote { border-left: 3px solid #e5e7eb; padding-left: 1rem; color: #6b7280; margin: 1rem 0; }
  pre { background: #1e1e2e; color: #cdd6f4; padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.875rem; }
  code.inline-code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 3px; font-size: 0.875em; }
  img { border-radius: 6px; }
  hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
  a { color: #2563eb; text-decoration: underline; }
  .tags { display: flex; gap: 6px; flex-wrap: wrap; margin: 0.5rem 0 1.5rem; }
  .tag { padding: 2px 10px; border-radius: 9999px; color: white; font-size: 0.75rem; }
  .page-break { border-top: 2px solid #e5e7eb; margin: 3rem 0; padding-top: 3rem; }
`.trim();

export function pageToHtml(
  title: string,
  content: JSONContent | null,
  tags: Tag[]
): string {
  const tagsHtml =
    tags.length > 0
      ? `<div class="tags">${tags.map((t) => `<span class="tag" style="background:${t.color}">${t.name}</span>`).join('')}</div>`
      : '';
  const bodyHtml = content ? nodeToHtml({type: 'doc', content: content.content}) : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
  <h1>${title}</h1>
  ${tagsHtml}
  ${bodyHtml}
</body>
</html>`;
}

export function allPagesToHtml(
  pages: Array<{title: string; content: JSONContent | null; tags: Tag[]}>
): string {
  const sections = pages
    .map((p, i) => {
      const tagsHtml =
        p.tags.length > 0
          ? `<div class="tags">${p.tags.map((t) => `<span class="tag" style="background:${t.color}">${t.name}</span>`).join('')}</div>`
          : '';
      const bodyHtml = p.content ? nodeToHtml({type: 'doc', content: p.content.content}) : '';
      return `${i > 0 ? '<div class="page-break"></div>' : ''}<h1>${p.title}</h1>${tagsHtml}${bodyHtml}`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Export</title>
  <style>${HTML_STYLES}</style>
</head>
<body>
  ${sections}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// JSON export
// ---------------------------------------------------------------------------

export function pageToJson(
  title: string,
  content: JSONContent | null,
  tags: Tag[],
  icon: string | null
): string {
  return JSON.stringify({title, icon, tags, content}, null, 2);
}

export function allPagesToJson(
  pages: Array<{title: string; content: JSONContent | null; tags: Tag[]; icon: string | null}>
): string {
  return JSON.stringify(pages, null, 2);
}

// ---------------------------------------------------------------------------
// Download helper
// ---------------------------------------------------------------------------

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'untitled';
}
