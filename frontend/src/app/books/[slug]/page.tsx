export default function BookDetailPage({ params }: { params: { slug: string } }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Book Detail</h1>
      <p>Slug: {params.slug}</p>
    </main>
  );
}
