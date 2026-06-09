import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    let res: Response;
    try {
      res = await fetch(`${apiUrl}/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return Response.json([], { status: 200 }); // backend offline → empty list
    }

    if (!res.ok) {
      console.error("[sessions] upstream", res.status, await res.text().catch(() => ""));
      return Response.json([], { status: 200 }); // don't blow up the UI
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error("[sessions] error", err);
    return Response.json([], { status: 200 });
  }
}
