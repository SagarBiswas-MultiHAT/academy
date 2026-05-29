import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed admin user
  const hashedPassword = await bcrypt.hash('AdminSecure!2026', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@multihat.dev' },
    update: {},
    create: {
      email: 'admin@multihat.dev',
      name: 'Sagar Biswas',
      hashedPassword,
      role: 'ADMIN',
    },
  });

  // Create wallet for admin
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: { userId: admin.id },
  });

  // Seed initial book
  const book = await prisma.book.upsert({
    where: { slug: 'google-dorks-complete-handbook' },
    update: {
      description: 'Master Google Dorking for ethical OSINT research. 8 in-depth chapters covering essential operators, advanced search techniques, special tools, power combinations, real-world applications, defensive strategies, and legal guidelines — with localized Bangladesh examples and appendices.',
      price: 612.39,
      chapterMetadata: [
        { index: 1, title: 'Introduction to Google Dorks', isFree: true },
        { index: 2, title: 'The 10 Essential Operators', isFree: true },
        { index: 3, title: 'Advanced Search Operators', isFree: true },
        { index: 4, title: 'Special Operators, Google Tools & the Calculator', isFree: true },
        { index: 5, title: 'Combining Operators for Power Searches', isFree: false },
        { index: 6, title: 'Real-World Applications', isFree: false },
        { index: 7, title: 'Defending Against Google Dorks', isFree: false },
        { index: 8, title: 'Legal and Ethical Guidelines', isFree: false },
        { index: 9, title: 'Appendix A: Master Operator Cheat Sheet', isFree: false },
        { index: 10, title: 'Appendix B: Glossary of Key Terms', isFree: false },
        { index: 11, title: 'Appendix C: Practice Exercise Answer Key', isFree: false },
        { index: 12, title: 'Appendix D: Further Resources and Tools', isFree: false },
        { index: 13, title: 'Appendix E: About the Author', isFree: false },
      ],
    },
    create: {
      title: 'Google Dorks: The Complete OSINT Handbook',
      slug: 'google-dorks-complete-handbook',
      description: 'Master Google Dorking for ethical OSINT research. 8 in-depth chapters covering essential operators, advanced search techniques, special tools, power combinations, real-world applications, defensive strategies, and legal guidelines — with localized Bangladesh examples and appendices.',
      price: 612.39,
      isPublished: true,
      chapterMetadata: [
        { index: 1, title: 'Introduction to Google Dorks', isFree: true },
        { index: 2, title: 'The 10 Essential Operators', isFree: true },
        { index: 3, title: 'Advanced Search Operators', isFree: true },
        { index: 4, title: 'Special Operators, Google Tools & the Calculator', isFree: true },
        { index: 5, title: 'Combining Operators for Power Searches', isFree: false },
        { index: 6, title: 'Real-World Applications', isFree: false },
        { index: 7, title: 'Defending Against Google Dorks', isFree: false },
        { index: 8, title: 'Legal and Ethical Guidelines', isFree: false },
        { index: 9, title: 'Appendix A: Master Operator Cheat Sheet', isFree: false },
        { index: 10, title: 'Appendix B: Glossary of Key Terms', isFree: false },
        { index: 11, title: 'Appendix C: Practice Exercise Answer Key', isFree: false },
        { index: 12, title: 'Appendix D: Further Resources and Tools', isFree: false },
        { index: 13, title: 'Appendix E: About the Author', isFree: false },
      ],
    },
  });

  // Seed quiz questions for the book
  const questions = [
    { prompt: 'Which Google operator restricts results to a specific website?', options: ['inurl:', 'site:', 'filetype:', 'intitle:'], correctAnswer: 'site:', sortOrder: 1 },
    { prompt: 'What does the filetype: operator do?', options: ['Searches file names', 'Filters by file extension', 'Searches inside files', 'Lists all files'], correctAnswer: 'Filters by file extension', sortOrder: 2 },
    { prompt: 'Which operator finds pages with a specific word in the title?', options: ['inurl:', 'intext:', 'intitle:', 'site:'], correctAnswer: 'intitle:', sortOrder: 3 },
    { prompt: 'What is the AROUND(X) operator used for?', options: ['Finding approximate matches', 'Proximity search between two terms', 'Searching around a date range', 'Geographic proximity filter'], correctAnswer: 'Proximity search between two terms', sortOrder: 4 },
    { prompt: 'Which operator filters results by date?', options: ['date:', 'before: and after:', 'time:', 'when:'], correctAnswer: 'before: and after:', sortOrder: 5 },
    { prompt: 'What is the recommended alternative to the cache: operator?', options: ['Google Drive', 'Wayback Machine (web.archive.org)', 'Google Scholar', 'Bing Cache'], correctAnswer: 'Wayback Machine (web.archive.org)', sortOrder: 6 },
    { prompt: 'Who first systematically documented Google Hacking techniques?', options: ['Kevin Mitnick', 'Johnny Long', 'Bruce Schneier', 'Edward Snowden'], correctAnswer: 'Johnny Long', sortOrder: 7 },
    { prompt: 'What does the ext:env query check for on your own domain?', options: ['Environment variables exposed publicly', 'File encoding types', 'Domain extensions', 'Email envelope headers'], correctAnswer: 'Environment variables exposed publicly', sortOrder: 8 },
    { prompt: 'What is the Golden Principle of Google Dorking?', options: ['Always use VPN', 'Findable does not mean legal to access', 'Share all findings publicly', 'Use automated tools only'], correctAnswer: 'Findable does not mean legal to access', sortOrder: 9 },
    { prompt: 'Which file contains the rules that tell Googlebot which pages NOT to crawl?', options: ['sitemap.xml', '.htaccess', 'robots.txt', 'index.html'], correctAnswer: 'robots.txt', sortOrder: 10 },
  ];

  for (const q of questions) {
    await prisma.quizQuestion.create({
      data: { bookId: book.id, ...q },
    });
  }

  console.log(`Seeded: admin=${admin.email}, book="${book.title}", questions=${questions.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
