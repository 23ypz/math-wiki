function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export type MarkdownHeading = {
  id: string;
  level: number;
  text: string;
};

function normalizeMarkdownSource(source?: string | null) {
  // 兼容用户把示例里的 \n 直接复制进输入框的情况。
  return (source || '').replace(/\\n/g, '\n').trim();
}

function plainText(value: string) {
  return value
    .replace(/\\\[|\\\]|\\\(|\\\)/g, '')
    .replace(/\$\$/g, '')
    .replace(/\$/g, '')
    .replace(/[`*_>#|\[\]()~-]/g, ' ')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stripMarkdown(source?: string | null, maxLength = 80) {
  const text = plainText(normalizeMarkdownSource(source));
  if (!text) return '暂无内容';
  return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
}

function renderInline(value: string) {
  // Extract image markdown before escaping or processing normal links.
  // This avoids ![alt](url) being partially consumed as ! + [alt](url).
  const imageStore: string[] = [];
  let prepared = value.replace(
    /!\[([^\]]*)\]\(\s*(<?https?:\/\/[^\s)>]+>?)\s*(?:["']([^"']*)["'])?\s*\)/g,
    (_match, rawAlt: string, rawSrc: string, rawTitle?: string) => {
      const src = rawSrc.replace(/^<|>$/g, '');
      const alt = rawAlt.trim() || 'Markdown 图片';
      const title = rawTitle?.trim();
      const token = `@@IMAGE_${imageStore.length}@@`;
      const caption = rawAlt.trim()
        ? `<span class="markdown-image-caption">${escapeHtml(rawAlt.trim())}</span>`
        : '';
      imageStore.push(
        `<span class="markdown-image"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" decoding="async">${caption}</span>`
      );
      return token;
    }
  );

  let html = escapeHtml(prepared);

  // Inline code first, so markdown syntax inside code is not interpreted.
  const codeStore: string[] = [];
  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@CODE_${codeStore.length}@@`;
    codeStore.push(`<code>${code}</code>`);
    return token;
  });

  // Links: [text](https://example.com). Images have already been replaced by tokens.
  html = html.replace(/\[([^\]]+)\]\(\s*(<?https?:\/\/[^\s)>]+>?)\s*(?:["']([^"']*)["'])?\s*\)/g, (_match, text, rawHref, title) => {
    const href = String(rawHref).replace(/^<|>$/g, '');
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
  });

  // MathJax inline math. Do this before emphasis so * inside TeX is not touched.
  html = html.replace(/\$(?!\$)([^$\n]+?)\$/g, '<span class="math-inline">\\($1\\)</span>');

  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

  codeStore.forEach((code, index) => {
    html = html.replace(`@@CODE_${index}@@`, code);
  });
  imageStore.forEach((image, index) => {
    html = html.replace(`@@IMAGE_${index}@@`, image);
  });

  return html;
}

function renderTable(rows: string[]) {
  const parseRow = (row: string) => row.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim());
  const header = parseRow(rows[0]);
  const bodyRows = rows.slice(2).map(parseRow);

  const thead = `<thead><tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${bodyRows.map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<div class="table-wrap"><table>${thead}${tbody}</table></div>`;
}

function isTableStart(lines: string[], index: number) {
  const first = lines[index]?.trim();
  const second = lines[index + 1]?.trim();
  return Boolean(
    first?.includes('|') &&
    second &&
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(second)
  );
}

let mathTimer: number | undefined;

export function typesetMath() {
  if (typeof window === 'undefined') return;
  window.clearTimeout(mathTimer);
  mathTimer = window.setTimeout(() => {
    const mathJax = (window as any).MathJax;
    if (mathJax?.typesetPromise) {
      mathJax.typesetPromise().catch(() => undefined);
    }
  }, 80);
}

export function extractHeadings(source?: string | null): MarkdownHeading[] {
  const text = normalizeMarkdownSource(source);
  if (!text) return [];

  const headings: MarkdownHeading[] = [];
  const lines = text.split(/\r?\n/);
  let inCode = false;
  let index = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      headings.push({
        id: `section-${index}`,
        level: Math.min(6, heading[1].length),
        text: plainText(heading[2]) || heading[2]
      });
      index += 1;
    }
  }

  return headings;
}

export function renderMarkdown(source?: string | null): string {
  const text = normalizeMarkdownSource(source);
  if (!text) return '<p class="muted">暂无内容</p>';

  const lines = text.split(/\r?\n/);
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let inBlockQuote = false;
  let headingIndex = 0;

  const closeUl = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
  };
  const closeOl = () => {
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };
  const closeBlockQuote = () => {
    if (inBlockQuote) {
      html.push('</blockquote>');
      inBlockQuote = false;
    }
  };
  const closeBlocks = () => {
    closeUl();
    closeOl();
    closeBlockQuote();
  };

  let i = 0;
  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      closeBlocks();
      i += 1;
      continue;
    }

    if (/^---+$/.test(line) || /^\*\*\*+$/.test(line)) {
      closeBlocks();
      html.push('<hr>');
      i += 1;
      continue;
    }

    if (line.startsWith('```')) {
      closeBlocks();
      const lang = line.slice(3).trim();
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        code.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      html.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.join('\n'))}</code></pre>`);
      continue;
    }

    if (line === '$$') {
      closeBlocks();
      const formula: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== '$$') {
        formula.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      html.push(`<div class="math-block">\\[${escapeHtml(formula.join('\n'))}\\]</div>`);
      continue;
    }

    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      closeBlocks();
      const formula = line.slice(2, -2).trim();
      html.push(`<div class="math-block">\\[${escapeHtml(formula)}\\]</div>`);
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      closeBlocks();
      const tableRows: string[] = [];
      tableRows.push(lines[i]);
      tableRows.push(lines[i + 1]);
      i += 2;
      while (i < lines.length && lines[i].trim().includes('|') && lines[i].trim()) {
        tableRows.push(lines[i]);
        i += 1;
      }
      html.push(renderTable(tableRows));
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeBlocks();
      const level = Math.min(6, heading[1].length);
      const id = `section-${headingIndex}`;
      headingIndex += 1;
      html.push(`<h${level} id="${id}">${renderInline(heading[2])}</h${level}>`);
      i += 1;
      continue;
    }

    const quote = line.match(/^>\s?(.+)$/);
    if (quote) {
      closeUl();
      closeOl();
      if (!inBlockQuote) {
        html.push('<blockquote>');
        inBlockQuote = true;
      }
      html.push(`<p>${renderInline(quote[1])}</p>`);
      i += 1;
      continue;
    }

    const checkItem = line.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (checkItem) {
      closeOl();
      closeBlockQuote();
      if (!inUl) {
        html.push('<ul class="task-list">');
        inUl = true;
      }
      const checked = checkItem[1].toLowerCase() === 'x' ? ' checked' : '';
      html.push(`<li class="task-list-item"><input type="checkbox" disabled${checked}> ${renderInline(checkItem[2])}</li>`);
      i += 1;
      continue;
    }

    const listItem = line.match(/^[-*+]\s+(.+)$/);
    if (listItem) {
      closeOl();
      closeBlockQuote();
      if (!inUl) {
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${renderInline(listItem[1])}</li>`);
      i += 1;
      continue;
    }

    const orderedItem = line.match(/^\d+\.\s+(.+)$/);
    if (orderedItem) {
      closeUl();
      closeBlockQuote();
      if (!inOl) {
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${renderInline(orderedItem[1])}</li>`);
      i += 1;
      continue;
    }

    closeBlocks();
    html.push(`<p>${renderInline(line)}</p>`);
    i += 1;
  }

  closeBlocks();
  return html.join('\n');
}
