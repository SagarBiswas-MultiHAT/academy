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

  const url = `${baseUrl}/users/me`;
  console.log("FETCH URL:", url);

  const res = await fetch(`${baseUrl}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const text = await res.text();

  throw new Error(
    JSON.stringify({
      status: res.status,
      contentType: res.headers.get("content-type"),
      body: text.substring(0, 500),
    })
  );
}
