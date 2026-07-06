import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type AdminSession = {
  token: string;
  user: { id: string; email: string; name?: string; role: string };
};

export async function requireAdmin(): Promise<AdminSession> {
  const token = (await cookies()).get("accessToken")?.value;

  console.log("TOKEN EXISTS:", !!token);

  if (!token) {
    console.log("NO TOKEN");
    redirect("/dashboard");
  }

  console.log("ENV NEXT_PUBLIC_API_URL =", process.env.NEXT_PUBLIC_API_URL);

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

  console.log("BASE URL:", baseUrl);

  const res = await fetch(`${baseUrl}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  console.log("STATUS:", res.status);

  const payload = await res.json();
  console.log("PAYLOAD:", payload);

  if (!res.ok) redirect("/dashboard");

  const user = payload.data;

  if (user.role !== "ADMIN") {
    console.log("NOT ADMIN");
    redirect("/dashboard");
  }

  return { token, user };
}
