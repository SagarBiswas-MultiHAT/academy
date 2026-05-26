export default function QuizPage({ params }: { params: { bookSlug: string } }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Quiz</h1>
      <p>Book slug: {params.bookSlug}</p>
    </main>
  );
}
