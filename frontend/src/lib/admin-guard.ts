import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AdminSession = {
  token: string;
  user: { id: string; email: string; name?: string; role: string };
};

export async function requireAdmin(): Promise<AdminSession> {
  const token = (await cookies()).get("accessToken")?.value;
  if (!token) redirect("/dashboard");

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  try {
    const res = await fetch(`${baseUrl}/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) redirect("/dashboard");
    const payload = await res.json();
    const user = payload?.data;
    if (!user || user.role !== "ADMIN") redirect("/dashboard");
    return { token, user };
  } catch {
    redirect("/dashboard");
  }
}
