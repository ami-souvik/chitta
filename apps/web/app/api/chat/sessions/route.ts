import { auth } from "@clerk/nextjs/server";

export async function GET() {
  const { userId, getToken } = await auth();
  if (!userId) return new Response("Unauthorized", { status: 401 });
  const token = await getToken();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const res = await fetch(`${apiUrl}/chat/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return Response.json(data);
}
