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
    update: {},
    create: {
      title: 'Google Dorks: The Complete OSINT Handbook',
      slug: 'google-dorks-complete-handbook',
      description: 'Master Google Dorking for ethical OSINT research. Covers advanced operators, localized Bangladesh examples, and real-world case studies.',
      price: 10.00,
      isPublished: true,
      chapterMetadata: [
        { index: 1, title: 'Introduction to Google Dorks', isFree: true },
        { index: 2, title: 'Basic Search Operators', isFree: true },
        { index: 3, title: 'Advanced Operators & Filters', isFree: true },
        { index: 4, title: 'OSINT Reconnaissance Techniques', isFree: false },
        { index: 5, title: 'Bangladesh-Specific Dork Examples', isFree: false },
      ],
    },
  });

  // Seed quiz questions for the book
  const questions = [
    { prompt: 'Which Google operator restricts results to a specific website?', options: ['inurl:', 'site:', 'filetype:', 'intitle:'], correctAnswer: 'site:', sortOrder: 1 },
    { prompt: 'What does the filetype: operator do?', options: ['Searches file names', 'Filters by file extension', 'Searches inside files', 'Lists all files'], correctAnswer: 'Filters by file extension', sortOrder: 2 },
    { prompt: 'Which operator finds pages with a specific word in the title?', options: ['inurl:', 'intext:', 'intitle:', 'site:'], correctAnswer: 'intitle:', sortOrder: 3 },
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
