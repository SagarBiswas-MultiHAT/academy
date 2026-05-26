export default function CheckoutPage({ params }: { params: { bookId: string } }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Checkout</h1>
      <p>Book ID: {params.bookId}</p>
    </main>
  );
}
