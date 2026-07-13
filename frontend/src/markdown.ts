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

/**
 * Normalize only line endings and accidentally double-escaped MathJax
 * delimiters. Do not decode every literal "\\n": doing so corrupts LaTeX
 * commands such as \\ne and \\neq.
 */
function normalizeMarkdownSource(source?: string | null) {
  return (source || '')
    .replace(/\r\n?/g, '\n')
    .replace(/\\\\\(/g, '\\(')
    .replace(/\\\\\)/g, '\\)')
    .replace(/\\\\\[/g, '\\[')
    .replace(/\\\\\]/g, '\\]')
    .trim();
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

function normalizeTexFormula(value: string) {
  // Some copied Markdown contains JSON-style double escaping (for example
  // \\Rightarrow). Inside a math region those should be ordinary TeX commands.
  return value.replace(/\\\\(?=[a-zA-Z])/g, '\\');
}

function renderInline(value: string) {
  const imageStore: string[] = [];
  const codeStore: string[] = [];
  const mathStore: string[] = [];

  let prepared = normalizeMarkdownSource(value);

  // Images are extracted before normal links so ![alt](url) is not partly
  // consumed as a normal link.
  prepared = prepared.replace(
    /!\[([^\]]*)\]\(\s*(<?https?:\/\/[^\s)>]+>?)\s*(?:["']([^"']*)["'])?\s*\)/g,
    (_match, rawAlt: string, rawSrc: string, rawTitle?: string) => {
      const src = rawSrc.replace(/^<|>$/g, '');
      const alt = rawAlt.trim() || 'Markdown 图片';
      const title = rawTitle?.trim();
      const token = `@@IMAGE${imageStore.length}@@`;
      const caption = rawAlt.trim()
        ? `<span class="markdown-image-caption">${escapeHtml(rawAlt.trim())}</span>`
        : '';
      imageStore.push(
        `<span class="markdown-image"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy" decoding="async">${caption}</span>`
      );
      return token;
    }
  );

  // Inline code is protected before math and emphasis parsing.
  prepared = prepared.replace(/`([^`]+)`/g, (_match, code: string) => {
    const token = `@@CODE${codeStore.length}@@`;
    codeStore.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  const saveInlineMath = (_match: string, formula: string) => {
    const token = `@@MATH${mathStore.length}@@`;
    mathStore.push(`<span class="math-inline">\\(${escapeHtml(normalizeTexFormula(formula.trim()))}\\)</span>`);
    return token;
  };

  // Accept both common inline-math syntaxes. Explicitly tokenizing \(...\)
  // also makes old records containing those delimiters render consistently.
  prepared = prepared.replace(/\\\(([^\n]*?)\\\)/g, saveInlineMath);
  prepared = prepared.replace(/\$(?!\$)([^$\n]+?)\$/g, saveInlineMath);

  let html = escapeHtml(prepared);

  // Links: [text](https://example.com). Images have already become tokens.
  html = html.replace(
    /\[([^\]]+)\]\(\s*(<?https?:\/\/[^\s)>]+>?)\s*(?:["']([^"']*)["'])?\s*\)/g,
    (_match, text: string, rawHref: string, title?: string) => {
      const href = String(rawHref).replace(/^<|>$/g, '');
      return `<a href="${href}" target="_blank" rel="noopener noreferrer"${title ? ` title="${title}"` : ''}>${text}</a>`;
    }
  );

  html = html
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/_([^_]+)_/g, '<em>$1</em>');

  codeStore.forEach((code, index) => {
    html = html.replace(`@@CODE${index}@@`, code);
  });
  mathStore.forEach((math, index) => {
    html = html.replace(`@@MATH${index}@@`, math);
  });
  imageStore.forEach((image, index) => {
    html = html.replace(`@@IMAGE${index}@@`, image);
  });

  return html;
}

/**
 * Split a Markdown table row without treating pipes inside inline code or
 * inline math as column separators. This allows formulas such as $|x|$.
 */
function parseTableRow(row: string) {
  let value = row.trim();
  if (value.startsWith('|')) value = value.slice(1);
  if (value.endsWith('|') && !value.endsWith('\\|')) value = value.slice(0, -1);

  const cells: string[] = [];
  let current = '';
  let inCode = false;
  let inDollarMath = false;
  let inParenMath = false;

  for (let i = 0; i < value.length; i += 1) {
    const char = value[i];
    const next = value[i + 1];
    const previous = value[i - 1];

    if (char === '`' && previous !== '\\') {
      inCode = !inCode;
      current += char;
      continue;
    }

    if (!inCode && char === '\\' && next === '(' && !inDollarMath) {
      inParenMath = true;
      current += '\\(';
      i += 1;
      continue;
    }

    if (!inCode && char === '\\' && next === ')' && inParenMath) {
      inParenMath = false;
      current += '\\)';
      i += 1;
      continue;
    }

    if (!inCode && !inParenMath && char === '$' && previous !== '\\') {
      inDollarMath = !inDollarMath;
      current += char;
      continue;
    }

    if (char === '|' && previous !== '\\' && !inCode && !inDollarMath && !inParenMath) {
      cells.push(current.trim());
      current = '';
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function renderTable(rows: string[]) {
  const header = parseTableRow(rows[0]);
  const bodyRows = rows.slice(2).map(parseTableRow);
  const columnCount = header.length;

  // Keep malformed rows from breaking the whole table layout. Missing cells
  // are padded and surplus text is merged into the last cell.
  const normalizeRow = (row: string[]) => {
    if (row.length === columnCount) return row;
    if (row.length < columnCount) return [...row, ...Array(columnCount - row.length).fill('')];
    return [...row.slice(0, columnCount - 1), row.slice(columnCount - 1).join(' | ')];
  };

  const thead = `<thead><tr>${header.map((cell) => `<th>${renderInline(cell)}</th>`).join('')}</tr></thead>`;
  const tbody = `<tbody>${bodyRows.map((row) => `<tr>${normalizeRow(row).map((cell) => `<td>${renderInline(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
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
let mathRetryTimer: number | undefined;

export function typesetMath() {
  if (typeof window === 'undefined') return;
  window.clearTimeout(mathTimer);
  window.clearTimeout(mathRetryTimer);

  const run = (attempt = 0) => {
    const mathJax = (window as any).MathJax;
    if (!mathJax?.typesetPromise) {
      // MathJax is loaded from a CDN. On a slow connection the first Vue
      // render can happen before the script is ready, so retry briefly.
      if (attempt < 20) {
        mathRetryTimer = window.setTimeout(() => run(attempt + 1), 150);
      }
      return;
    }

    Promise.resolve(mathJax.startup?.promise)
      .then(() => mathJax.typesetPromise())
      .catch(() => undefined);
  };

  mathTimer = window.setTimeout(() => run(), 80);
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
  const closeBlocks = () => {
    closeUl();
    closeOl();
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

    // Collect the complete block quote before rendering it. Rendering each
    // quoted line independently breaks blank quote lines (`>`) and prevents
    // nested block constructs such as display math, lists, tables and code
    // fences from being recognized.
    if (/^>\s?/.test(line)) {
      closeBlocks();

      const quoteLines: string[] = [];

      while (i < lines.length) {
        const quoteMatch = lines[i].match(/^\s*>\s?(.*)$/);
        if (!quoteMatch) break;

        // Strip exactly one quote marker. A nested quote such as `>> text`
        // keeps the second marker and is handled by the recursive render.
        quoteLines.push(quoteMatch[1]);
        i += 1;
      }

      const quoteSource = quoteLines.join('\n');
      const quoteHtml = quoteSource.trim() ? renderMarkdown(quoteSource) : '';
      html.push(`<blockquote>${quoteHtml}</blockquote>`);
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

    if (line === '$$' || line === '\\[') {
      closeBlocks();
      const closingDelimiter = line === '$$' ? '$$' : '\\]';
      const formula: string[] = [];
      i += 1;
      while (i < lines.length && lines[i].trim() !== closingDelimiter) {
        formula.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      html.push(`<div class="math-block">\\[${escapeHtml(normalizeTexFormula(formula.join('\n')))}\\]</div>`);
      continue;
    }

    if (line.startsWith('$$') && line.endsWith('$$') && line.length > 4) {
      closeBlocks();
      const formula = line.slice(2, -2).trim();
      html.push(`<div class="math-block">\\[${escapeHtml(normalizeTexFormula(formula))}\\]</div>`);
      i += 1;
      continue;
    }

    if (line.startsWith('\\[') && line.endsWith('\\]') && line.length > 4) {
      closeBlocks();
      const formula = line.slice(2, -2).trim();
      html.push(`<div class="math-block">\\[${escapeHtml(normalizeTexFormula(formula))}\\]</div>`);
      i += 1;
      continue;
    }

    if (isTableStart(lines, i)) {
      closeBlocks();
      const tableRows: string[] = [lines[i], lines[i + 1]];
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

    const checkItem = line.match(/^[-*+]\s+\[([ xX])\]\s+(.+)$/);
    if (checkItem) {
      closeOl();
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
