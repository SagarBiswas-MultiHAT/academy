import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

type ChapterMeta = { index: number; title: string; isFree: boolean };

// Chapter boundary line numbers (1-indexed) derived from the markdown structure.
// Each entry is [startLine, endLine] inclusive.
const CHAPTER_BOUNDARIES: Record<number, [number, number]> = {
  1: [320, 489],
  2: [490, 1060],
  3: [1061, 1642],
  4: [1643, 3340],
  5: [3341, 3779],
  6: [3780, 6078],
  7: [6079, 6470],
  8: [6471, 6677],
  9: [6678, 6821],   // Appendix A
  10: [6822, 6943],  // Appendix B
  11: [6944, 7117],  // Appendix C
  12: [7118, 7255],  // Appendix D
  13: [7256, 7336],  // Appendix E
};

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
    return { books, total, page, limit };
  }

  async findBySlug(slug: string) {
    const book = await this.prisma.book.findUnique({ where: { slug } });
    if (!book) throw new NotFoundException('Book not found');
    return book;
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

    // Read the markdown file and extract the chapter content
    const boundaries = CHAPTER_BOUNDARIES[chapterIndex];
    if (!boundaries) throw new NotFoundException('Chapter content not available');

    const bookDir = path.resolve(process.cwd(), '..', 'books', 'Google_Dorks_Complete_Handbook');
    const mdPath = path.join(bookDir, 'Google_Dorks_Complete_Handbook.md');

    if (!fs.existsSync(mdPath)) {
      throw new NotFoundException('Book content file not found');
    }

    const fileContent = fs.readFileSync(mdPath, 'utf-8');
    const lines = fileContent.split(/\r?\n/);

    // Extract lines (convert from 1-indexed to 0-indexed)
    const [startLine, endLine] = boundaries;
    const chapterLines = lines.slice(startLine - 1, endLine);

    let content = chapterLines.join('\n');

    // ── Strip pandoc artifact: the decorative CHAPTER N header block ──
    // Matches lines like: **CHAPTER 1\** or **CHAPTER 2\** followed by subtitle lines
    content = content.replace(/^\*\*CHAPTER \d+\\\*\*\n+\*\*[^\n]+\*\*\n+\*[^\n]+\*\n*/gm, '');
    content = content.replace(/^\*\*CHAPTER \d+\\\*\*\n+\*\*[^\n]+\*\*\n*/gm, '');
    // Also catch italicized chapter headers like *CHAPTER 1*
    content = content.replace(/^\*CHAPTER \d+\*\n*/gm, '');

    // ── Strip APPENDIX header artifact blocks ──
    content = content.replace(/^\*\*\\\n\\\nAPPENDIX [A-E]\\\*\*\n+\*\*[^\n]+\*\*\n*/gm, '');
    content = content.replace(/^APPENDIX [A-E]\\\*\*\n+\*\*[^\n]+\*\*\n*/gm, '');

    // ── Convert pandoc grid tables to GFM pipe tables ──
    // Grid tables look like: rows of dashes/pipes followed by content rows
    content = convertGridTables(content);
    content = convertPipeGridTables(content);

    // ── Strip remaining pandoc artifacts ──
    content = content.replace(/\[([^\]]*)\]\{\.underline\}/g, '$1');   // {.underline} spans
    content = content.replace(/\\\\/g, '');                              // double backslashes
    content = content.replace(/\\'/g, "'");                              // escaped apostrophes
    content = content.replace(/\\"/g, '"');                              // escaped quotes
    content = content.replace(/^\\\s*$/gm, '');                         // lone backslash lines
    content = content.replace(/\n{3,}/g, '\n\n');                       // collapse excess blank lines

    return {
      bookTitle: book.title,
      bookSlug: book.slug,
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
