import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });
    const token = await getToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    let res: Response;
    try {
      res = await fetch(`${apiUrl}/chat/sessions/${params.sessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      return Response.json([], { status: 200 });
    }

    if (!res.ok) {
      console.error("[session-messages] upstream", res.status, await res.text().catch(() => ""));
      return Response.json([], { status: 200 });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    console.error("[session-messages] error", err);
    return Response.json([], { status: 200 });
  }
}
