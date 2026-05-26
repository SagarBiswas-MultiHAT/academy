export default function ReferralPage({ params }: { params: { code: string } }) {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold">Referral</h1>
      <p>Referral code: {params.code}</p>
    </main>
  );
}
