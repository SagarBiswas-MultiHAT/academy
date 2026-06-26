import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import { getPremiumPdfProductBySlug, isPremiumPdfProduct } from '../common/utils/premium-pdf';

type ChapterMeta = { index: number; title: string; isFree: boolean };

// Dynamic chapter boundaries are computed on the fly in getChapterContent
// to prevent "bleeding" bugs when the markdown file is edited and line numbers shift.

/**
 * Converts pandoc-style grid tables (ASCII art with dashes/pipes) into
 * GFM pipe tables that react-markdown can render as HTML tables.
 *
 * Grid table format:
 *   ------- --------- -----
 *   **Col** **Col2**  **C3**
 *   ------- --------- -----
 *   cell    cell      cell
 *   ------- --------- -----
 */
function convertGridTables(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Detect a grid table separator line: starts with spaces then dashes, multiple groups
    const isSeparator = /^[\s]{0,4}[-=]{2,}([\s]+[-=]{2,}){1,}[\s]*$/.test(line);

    if (isSeparator) {
      // Look ahead to determine if this is the header separator or a data separator
      // Collect the full grid table block
      const tableLines: string[] = [];
      let j = i;

      // Walk forward collecting all lines in the table block
      let lastSepIndex = j;
      while (j < lines.length) {
        const tl = lines[j];
        const isSep = /^[\s]{0,4}[-=]{2,}([\s]+[-=]{2,})*[\s]*$/.test(tl);
        const isEmpty = tl.trim() === '';
        
        if (isSep) {
          lastSepIndex = j;
        } else if (!isEmpty && !/^[\s]/.test(tl) && tableLines.length > 0) {
          // Non-separator, non-indented line — table definitively ended
          break;
        } else if (isEmpty && tableLines.length > 0) {
          // If we hit an empty line right after a separator, the table is done.
          // If we hit an empty line inside data rows, it might just be spacing.
          if (lastSepIndex === j - 1) {
            break;
          }
        }
        tableLines.push(tl);
        j++;
      }
      
      // Trim any trailing empty lines that got captured
      while (tableLines.length > 0 && tableLines[tableLines.length - 1].trim() === '') {
        tableLines.pop();
        j--;
      }

      // Parse rows between separators
      const rows: string[][] = [];

      // Get column widths from first separator (which must be a broken line to define columns)
      const firstSep = tableLines.find(tl => /^[\s]{0,4}[-=]{2,}([\s]+[-=]{2,}){1,}[\s]*$/.test(tl)) || tableLines[0];
      const colRanges: [number, number][] = [];
      let inDash = false;
      let start = 0;
      for (let c = 0; c < firstSep.length; c++) {
        if (firstSep[c] === '-' || firstSep[c] === '=') {
          if (!inDash) { start = c; inDash = true; }
        } else {
          if (inDash) { colRanges.push([start, c]); inDash = false; }
        }
      }
      if (inDash) colRanges.push([start, firstSep.length]);

      if (colRanges.length < 2) {
        // Not a real table — emit as-is
        result.push(...tableLines);
        i = j;
        continue;
      }

      // Extract cell content from each non-separator line
      let currentRow: string[] = [];
      for (const tl of tableLines) {
        const isSep = /^[\s]{0,4}[-=]{2,}([\s]+[-=]{2,})*[\s]*$/.test(tl);
        if (isSep) {
          if (currentRow.length > 0) {
            rows.push(currentRow.map(c => c.trim()));
            currentRow = [];
          }
        } else if (tl.trim() === '') {
          // Empty line indicates end of a multi-line row
          if (currentRow.length > 0) {
            rows.push(currentRow.map(c => c.trim()));
            currentRow = [];
          }
        } else {
          const cells = colRanges.map(([s, e]) =>
            (tl.substring(s, e) || '').trim()
          );
          if (currentRow.length === 0) {
            currentRow = cells;
          } else {
            // Multi-line cell — append to existing
            cells.forEach((c, idx) => {
              if (c) currentRow[idx] = (currentRow[idx] ? currentRow[idx] + ' ' : '') + c;
            });
          }
        }
      }
      if (currentRow.length > 0) rows.push(currentRow.map(c => c.trim()));

      if (rows.length === 0) {
        result.push(...tableLines);
        i = j;
        continue;
      }

      // Emit GFM table
      const header = rows[0];
      result.push('| ' + header.join(' | ') + ' |');
      result.push('| ' + header.map(() => '---').join(' | ') + ' |');
      for (let r = 1; r < rows.length; r++) {
        result.push('| ' + rows[r].join(' | ') + ' |');
      }
      result.push('');
      i = j;
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}

/**
 * Converts pandoc-style pipe grid tables (ASCII art with +---+ borders and | columns) into
 * GFM pipe tables that react-markdown can render as HTML tables.
 */
function convertPipeGridTables(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const isPipeGridSep = /^[\s]*\+[-=]+(\+[-=]+)+\+[\s]*$/.test(line);

    if (isPipeGridSep) {
      const tableLines: string[] = [];
      let j = i;

      let lastSepIndex = j;
      while (j < lines.length) {
        const tl = lines[j];
        const isEmpty = tl.trim() === '';
        const isSep = /^[\s]*\+[-=]+(\+[-=]+)+\+[\s]*$/.test(tl);
        
        if (isSep) {
          lastSepIndex = j;
        } else if (!isEmpty && !tl.trim().startsWith('|')) {
          break; // Not a valid table line
        } else if (isEmpty) {
          if (lastSepIndex === j - 1) {
            break; // Empty line after separator -> end of table
          }
        }
        
        tableLines.push(tl);
        j++;
      }
      
      // Trim any trailing empty lines that got captured
      while (tableLines.length > 0 && tableLines[tableLines.length - 1].trim() === '') {
        tableLines.pop();
        j--;
      }

      // Process the collected table block
      const rows: string[][] = [];
      let currentRow: string[] = [];

      for (let k = 0; k < tableLines.length; k++) {
        const tl = tableLines[k];
        const isSep = /^[\s]*\+[-=]+(\+[-=]+)+\+[\s]*$/.test(tl);
        
        if (isSep) {
          if (currentRow.length > 0) {
            rows.push(currentRow.map(c => c.trim()));
            currentRow = [];
          }
        } else if (tl.trim().startsWith('|')) {
          // It's a data line: | cell | cell |
          const parts = tl.split('|');
          if (parts.length >= 3) {
            const cells = parts.slice(1, parts.length - 1).map(c => c.trim());
            if (currentRow.length === 0) {
              currentRow = cells;
            } else {
              // Append to existing row (multi-line cells)
              cells.forEach((c, idx) => {
                if (c) {
                  currentRow[idx] = (currentRow[idx] ? currentRow[idx] + ' ' : '') + c;
                }
              });
            }
          }
        }
      }

      if (rows.length > 0) {
        // Emit GFM table
        const header = rows[0];
        result.push('| ' + header.join(' | ') + ' |');
        result.push('| ' + header.map(() => '---').join(' | ') + ' |');
        for (let r = 1; r < rows.length; r++) {
          result.push('| ' + rows[r].join(' | ') + ' |');
        }
        result.push('');
      } else {
        result.push(...tableLines);
      }
      
      i = j;
      continue;
    }

    result.push(line);
    i++;
  }

  return result.join('\n');
}


@Injectable()
export class BooksService {
  constructor(private prisma: PrismaService) {}

  private withComputedFlags<T extends { slug: string }>(book: T) {
    return {
      ...book,
      hasPremiumPdf: isPremiumPdfProduct(book.slug),
      requiresGatewayPayment: false,
    };
  }

  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [books, total] = await Promise.all([
      this.prisma.book.findMany({
        where: { isPublished: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.book.count({ where: { isPublished: true } }),
    ]);
    return { books: books.map((book) => this.withComputedFlags(book)), total, page, limit };
  }

  async findBySlug(slug: string, userId?: string) {
    const book = await this.prisma.book.findUnique({ where: { slug } });
    if (!book) throw new NotFoundException('Book not found');
    
    let isOwned = false;
    let ownsPdf = false;
    if (userId) {
      const orders = await this.prisma.order.findMany({
        where: { userId, bookId: book.id, status: 'PAID' },
      });
      if (orders.length > 0) {
        isOwned = true;
        ownsPdf = orders.some(o => o.includesPdf || (o.paymentMethod === 'GATEWAY' && Boolean(o.aamarpayTranId?.endsWith('-PDF'))));
      }
    }

    return {
      ...this.withComputedFlags(book),
      isOwned,
      ownsPdf,
    };
  }

  /**
   * Returns the markdown content for a specific chapter of a book.
   * Only free chapters are publicly accessible; paid chapters require purchase verification.
   */
  async getChapterContent(slug: string, chapterIndex: number, userId?: string) {
    const book = await this.prisma.book.findUnique({ where: { slug } });
    if (!book) throw new NotFoundException('Book not found');

    const chapters = (book.chapterMetadata as unknown as ChapterMeta[]) ?? [];
    const chapter = chapters.find((ch) => ch.index === chapterIndex);
    if (!chapter) throw new NotFoundException('Chapter not found');

    // Access control: free chapters are public, paid chapters require purchase
    if (!chapter.isFree) {
      if (!userId) {
        throw new ForbiddenException('Purchase required to access this chapter');
      }
      const order = await this.prisma.order.findFirst({
        where: { userId, bookId: book.id, status: 'PAID' },
      });
      if (!order) {
        throw new ForbiddenException('Purchase required to access this chapter');
      }
    }

    const bookDir = path.resolve(process.cwd(), '..', 'books', 'Google_Dorks_Complete_Handbook');
    const mdPath = path.join(bookDir, 'Google_Dorks_Complete_Handbook.md');

    if (!fs.existsSync(mdPath)) {
      throw new NotFoundException('Book content file not found');
    }

    const fileContent = fs.readFileSync(mdPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    // Dynamically compute chapter boundaries to handle markdown edits gracefully
    const chaptersOffsets: number[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^#\s+Chapter\s+\d+:|^APPENDIX\s+[A-E]\\\*\\\*/i.test(lines[i])) {
        chaptersOffsets.push(i);
      }
    }

    const starts: number[] = [];
    for (let i = 0; i < chaptersOffsets.length; i++) {
      const headerLine = chaptersOffsets[i]; // line index of `# Chapter N:`
      let lookback = Math.max(0, headerLine - 25);
      if (i > 0) lookback = Math.max(lookback, chaptersOffsets[i - 1] + 1);

      // Scan backward from the `# Chapter N:` heading to find the pandoc decorative marker
      // `\*\*CHAPTER N\*\*` — that is the true start of a chapter block.
      // Stop as soon as we find it; do NOT treat other content (Key Takeaways, prose) as a boundary.
      let actualStart = headerLine;
      for (let j = headerLine - 1; j >= lookback; j--) {
        const l = lines[j];
        if (/^\\?\*\\?\*CHAPTER\s+\d+\\?\*\\?\*/.test(l) || l.includes('\\*\\*CHAPTER')) {
          actualStart = j; // pandoc marker IS the first line of this chapter block
          break;
        }
      }

      starts.push(actualStart);
    }

    const boundaries: Record<number, [number, number]> = {};
    for (let i = 0; i < starts.length; i++) {
      const startIdx = starts[i];
      // Chapter N ends one line before Chapter N+1's pandoc marker starts
      const endIdx = i + 1 < starts.length ? starts[i + 1] - 1 : lines.length - 1;
      boundaries[i + 1] = [startIdx + 1, endIdx + 1]; // 1-indexed to match legacy logic
    }

    // Read the markdown file and extract the chapter content
    const bounds = boundaries[chapterIndex];
    if (!bounds) throw new NotFoundException('Chapter content not available');

    // Extract lines (convert from 1-indexed to 0-indexed)
    const [startLine, endLine] = bounds;
    const chapterLines = lines.slice(startLine - 1, endLine);

    let content = chapterLines.join('\n');

    // Normalise CRLF → LF so all downstream split/regex is line-ending agnostic
    content = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');


    // ══════════════════════════════════════════════════════════════════
    // STEP 1: Strip pandoc-generated chapter/appendix decorative headers
    // We precisely remove the redundant headers but PRESERVE the subtitles.
    // ══════════════════════════════════════════════════════════════════

    // Remove the redundant markdown chapter heading (frontend renders the gradient title)
    content = content.replace(/^#\s+Chapter\s+\d+:[^\n]*\n+/gm, '');

    // Remove `**CHAPTER N**`
    content = content.replace(/^\\\*\\\*CHAPTER\s+\d+\\\*\\\*\s*\n+/gm, '');
    content = content.replace(/^\*\*CHAPTER\s+\d+\*\*\s*\n+/gm, '');
    content = content.replace(/^\*CHAPTER\s+\d+\*\s*\n+/gm, '');

    // Remove the bold title that exactly matches the chapter title
    const escapedTitle = chapter.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(new RegExp(`^\\*\\*${escapedTitle}\\*\\*\\s*\\n+`, 'im'), '');

    // ── Strip APPENDIX header artifacts ──
    content = content.replace(/^\*\*\\?\n?\\?\n?APPENDIX [A-E]\\?\*\*\s*\n+/gm, '');
    content = content.replace(/^APPENDIX [A-E]\\\*\*\s*\n+/gm, '');
    content = content.replace(/^APPENDIX [A-E]\*\*\s*\n+/gm, '');
    
    // Remove the bold title for Appendices
    content = content.replace(new RegExp(`^\\*\\*${escapedTitle}\\*\\*\\s*\\n+`, 'im'), '');

    // ══════════════════════════════════════════════════════════════════
    // STEP 2a: Normalise escaped characters FIRST so they don't
    // interfere with the {.underline} span regex below
    // ══════════════════════════════════════════════════════════════════
    content = content.replace(/\\\\/g, '');          // double backslashes → nothing
    content = content.replace(/\\'/g, "'");           // escaped apostrophes
    content = content.replace(/\\"/g, '"');           // escaped quotes
    content = content.replace(/^\\\s*$/gm, '');      // lone backslash lines
    content = content.replace(/\\-{2,}/g, '--');     // escaped dashes \--
    content = content.replace(/[\\\\](?=\r?\n)/g, ''); // trailing backslash at end of line (pandoc)

    // ══════════════════════════════════════════════════════════════════
    // STEP 2b (pre-pass): Convert ASCII flowchart to HTML BEFORE underline stripping
    // so flowchart [brackets] are HTML elements when the underline regex runs.
    // This prevents the lazy [\s\S]*? from cross-spanning into crawling para.
    // ══════════════════════════════════════════════════════════════════
    content = content.replace(
      /<div\s+align="center">[\s\S]*?<\/div>/g,
      (match) => {
        const stepPattern = /\[\s*([^\]]+?)\s*\]/g;
        const steps: string[] = [];
        let m: RegExpExecArray | null;
        // eslint-disable-next-line no-cond-assign
        while ((m = stepPattern.exec(match)) !== null) {
          steps.push(m[1].trim().replace(/\\/g, '').trim());
        }
        if (steps.length < 2) return match;
        const stepsHtml = steps
          .map((step, i) => {
            const isFirst = i === 0;
            const isLast = i === steps.length - 1;
            const accent = isFirst || isLast ? 'flowchart-step--accent' : '';
            const arrow = i < steps.length - 1
              ? '<div class="flowchart-arrow">▼</div>'
              : '';
            return `<div class="flowchart-step ${accent}"><span>${step}</span></div>${arrow}`;
          })
          .join('\n');
        return `<div class="flowchart-container">${stepsHtml}</div>`;
      }
    );

    // STEP 2b: Strip ALL pandoc {.underline} spans — including those
    // that span multiple lines (pandoc reflows long underlined phrases).
    // Strategy: use a lazy dotall match [\s\S]*? so newlines inside
    // the span are consumed.  Run twice to handle adjacent spans.
    // ══════════════════════════════════════════════════════════════════
    // Pass 1 – multi-line aware: [any content]{.underline} → content
    for (let pass = 0; pass < 4; pass++) {
      content = content.replace(/\[([^\]]*)\]\{[^}]*\.underline[^}]*\}/g, '$1');
    }
    // Pass 2 – remove any remaining bare {.underline} annotation stubs
    content = content.replace(/\{[^}]*\.underline[^}]*\}/g, '');
    // STEP 2c (bold-merge): After underline stripping, pandoc leaves adjacent
    // bold markers like **an****yone** from split spans. Collapse them.
    for (let m = 0; m < 3; m++) {
      content = content.replace(/\*\*([^*\n]+)\*\*\*\*([^*\n]+)\*\*/g, '**$1$2**');
    }
    // Strip lone ** pairs with no content between them (empty bold artifacts)
    content = content.replace(/\*\*\s*\*\*/g, '');

    // ══════════════════════════════════════════════════════════════════


    // ══════════════════════════════════════════════════════════════════
    // STEP 2c (orphan cleanup): Remove orphaned [ ] bracket pairs that
    // are NOT markdown links, images, or footnotes. These are left-over
    // from pandoc's fragmented underline spans.
    // ══════════════════════════════════════════════════════════════════
    // Single-character brackets: [g], [y], [l], etc.
    content = content.replace(/\[([a-zA-Z])\](?![\(\[])/g, '$1');
    // Multi-word phrase brackets not followed by ( or [ (i.e. not links)
    content = content.replace(/\[([a-zA-Z][\s\S]{0,200}?)\](?![\(\[])/g, '$1');
    // Restore any escaped \[ \] that should be literal brackets
    content = content.replace(/\\\[/g, '[');
    content = content.replace(/\\\]/g, ']');

    // ══════════════════════════════════════════════════════════════════
    // STEP 4: Fix deeply-nested blockquotes (the "Russian Doll" bug)
    // Pandoc reflows underlined text across blockquote lines, creating
    // chains of >> >>> >>>> nesting. Flatten them all to a single >
    // ══════════════════════════════════════════════════════════════════
    content = content.replace(/^(>(?:\s*>)+)\s*/gm, '> ');


    // ══════════════════════════════════════════════════════════════════
    // STEP 6: Convert inline code examples that appear in blockquotes
    // Pattern: a lone blockquote line that IS a search query / command
    // (no narrative text, just operator syntax) → promote to code fence
    // ══════════════════════════════════════════════════════════════════
    content = content.replace(
      /^> ((?:site:|intitle:|inurl:|filetype:|ext:|cache:|related:|info:|intext:|allintitle:|https?:\/\/)[^\n]+)$/gm,
      '```\n$1\n```\n'
    );

    // ══════════════════════════════════════════════════════════════════

    // ══════════════════════════════════════════════════════════════════
    // ══════════════════════════════════════════════════════════════════
    // STEP 6b: Ensure blank line after closing code fences and after any
    // blockquote line immediately followed by prose (no blank separator).
    // Pandoc omits these blanks, causing text to hug code blocks.
    // ══════════════════════════════════════════════════════════════════
    // Blank line after any > blockquote line not followed by blank or >
    content = content.replace(/^(> [^\n\r]+)\r?\n(?!\r?\n|>)/gm, '$1\n\n');

    // ══════════════════════════════════════════════════════════════════
    // STEP 6c: Promote > **…Examples…** blockquote headings to real ####
    // headings so they always render on their own line with clear styling.
    // ══════════════════════════════════════════════════════════════════
    content = content.replace(
      /^> \*\*([^*]*(Example|Examples|Queries|Scenarios)[^*]*)\*\*\s*$/gm,
      '\n#### $1\n'
    );
    // Also convert italic blockquote comment headings: > _# SECURITY AUDIT..._
    content = content.replace(
      /^> _\\?#\s*(SECURITY AUDIT[^_\n]*)_\s*$/gm,
      '\n#### $1\n'
    );
    // Also convert italic blockquote comment headings: > _# SECURITY AUDIT..._
    content = content.replace(
      /^> _\\?#\s*(SECURITY AUDIT[^_\n]*)_\s*$/gm,
      '\n#### $1\n'
    );


    // STEP 7: Detect callout types in blockquotes and prefix them with
    // a data-type attribute via an HTML wrapper so the frontend can
    // apply distinct styling (NOTE, IMPORTANT, TIP, CRITICAL, WARNING)
    // ══════════════════════════════════════════════════════════════════
    // We do a line-by-line scan to wrap blockquote groups with typed divs
    const bqLines = content.split('\n');
    const bqResult: string[] = [];
    let inBq = false;
    let bqType = 'default';
    let bqBuffer: string[] = [];

    const flushBq = () => {
      if (bqBuffer.length > 0) {
        if (bqType !== 'default') {
          // For typed callouts, strip the leading `> ` from each line
          // so the content becomes pure HTML inside the div wrapper
          const innerLines = bqBuffer.map(l => l.replace(/^>\s?/, ''));
          // Strip the bold callout prefix (e.g. **CRITICAL:**) from the first line
          // so it doesn't render redundantly inside the box
          innerLines[0] = innerLines[0].replace(/^(?:\*\*|_)?(?:NOTE|IMPORTANT|GOLDEN PRINCIPLE|TIP|CRITICAL|WARNING)[:\-]?\s*(?:\*\*|_)?\s*[:\-]?\s*/i, '');

          // Join consecutive non-empty lines into paragraphs, separated by <br> on blank lines
          const paragraphs: string[] = [];
          let para: string[] = [];
          for (const il of innerLines) {
            if (il.trim() === '') {
              if (para.length > 0) {
                const joined = para.join(' ')
                  .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
                  .replace(/\*([^*]+)\*/g, '<em>$1</em>');
                paragraphs.push('<p>' + joined + '</p>');
                para = [];
              }
            } else {
              para.push(il);
            }
          }
          if (para.length > 0) {
            const joined = para.join(' ')
              .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
              .replace(/\*([^*]+)\*/g, '<em>$1</em>');
            paragraphs.push('<p>' + joined + '</p>');
          }
          bqResult.push(`<div data-callout="${bqType}">`);
          bqResult.push(...paragraphs);
          bqResult.push('</div>');
        } else {
          bqResult.push(...bqBuffer);
        }
        bqBuffer = [];
        bqType = 'default';
        inBq = false;
      }
    };

    for (const line of bqLines) {
      const isBqLine = /^>\s?/.test(line);
      if (isBqLine) {
        if (!inBq) {
          inBq = true;
          // Detect type from first blockquote line
          const firstContent = line.replace(/^>\s?/, '');
          if (/^\*\*NOTE[:\*]|^NOTE:/i.test(firstContent)) bqType = 'note';
          else if (/^\*\*IMPORTANT[:\*]|^IMPORTANT:|GOLDEN PRINCIPLE/i.test(firstContent)) bqType = 'important';
          else if (/^\*\*TIP[:\*]|^TIP:/i.test(firstContent)) bqType = 'tip';
          else if (/^\*\*CRITICAL[:\*]|^CRITICAL:/i.test(firstContent)) bqType = 'critical';
          else if (/^\*\*WARNING[:\*]|^WARNING:/i.test(firstContent)) bqType = 'warning';
          else bqType = 'default';
        }
        bqBuffer.push(line);
      } else {
        flushBq();
        bqResult.push(line);
      }
    }
    flushBq();
    content = bqResult.join('\n');

    // ══════════════════════════════════════════════════════════════════
    // STEP 8: Convert pandoc grid/pipe tables to GFM pipe tables
    // ══════════════════════════════════════════════════════════════════
    content = convertGridTables(content);
    content = convertPipeGridTables(content);

    // ══════════════════════════════════════════════════════════════════
    // STEP 9: Resolve relative image links to the API URL
    // ══════════════════════════════════════════════════════════════════
    const apiUrl = process.env.API_URL || 'http://localhost:5000/api/v1';
    content = content.replace(/!\[([^\]]*)\]\((media\/[^\)]+)\)/g, `![$1](${apiUrl}/books/${book.slug}/$2)`);

    // ══════════════════════════════════════════════════════════════════
    // STEP 10: Typography polish
    // ══════════════════════════════════════════════════════════════════
    // Add extra spacing before numbered section headings and Key Takeaways
    content = content.replace(/^(#{1,6}\s+\d+\.\d+.*)$/gm, '&nbsp;\n\n$1');
    content = content.replace(/^(#{1,6}\s+⭐.*Key Takeaways.*)$/gm, '&nbsp;\n\n$1');
    // Convert --- (em-dash) sequences used as section dividers
    content = content.replace(/^---\s*$/gm, '');
    // Collapse excess blank lines
    content = content.replace(/\n{3,}/g, '\n\n');
    // Strip stray backslash-newline artifacts from pandoc
    content = content.replace(/\\\n/g, '\n');

    return {
      bookTitle: book.title,
      bookSlug: book.slug,
      hasPremiumPdf: isPremiumPdfProduct(book.slug),
      chapter: {
        index: chapter.index,
        title: chapter.title,
        isFree: chapter.isFree,
      },
      content,
      totalChapters: chapters.length,
    };
  }

  // Admin: Create book
  async create(data: { title: string; slug: string; description: string; price: number; chapterMetadata: any }) {
    return this.prisma.book.create({ data });
  }

  // Admin: Update book
  async update(id: string, data: Partial<{ title: string; description: string; price: number; isPublished: boolean; chapterMetadata: any }>) {
    return this.prisma.book.update({ where: { id }, data });
  }
}
