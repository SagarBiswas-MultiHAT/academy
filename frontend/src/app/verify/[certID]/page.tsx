export default function VerifyPage({ params }: { params: { certID: string } }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Certificate Verification</h1>
      <p>Certificate ID: {params.certID}</p>
    </main>
  );
}
