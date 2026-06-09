import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return new Response("Unauthorized", { status: 401 });

    const token = await getToken();
    const body = await req.json();

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    let upstream: Response;
    try {
      upstream = await fetch(`${apiUrl}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (networkErr) {
      console.error("[chat/route] Backend unreachable:", networkErr);
      // Return a SSE stream with a friendly error so the client can display it
      const errorStream = new ReadableStream({
        start(controller) {
          const msg = JSON.stringify({ token: "⚠️ Backend is offline. Start the API server with `uvicorn main:app --reload` in apps/api." });
          controller.enqueue(new TextEncoder().encode(`data: ${msg}\n\ndata: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "Unknown error");
      console.error(`[chat/route] Upstream ${upstream.status}:`, text);
      const errorStream = new ReadableStream({
        start(controller) {
          const msg = JSON.stringify({ token: `⚠️ API error (${upstream.status}): ${text.slice(0, 200)}` });
          controller.enqueue(new TextEncoder().encode(`data: ${msg}\n\ndata: [DONE]\n\n`));
          controller.close();
        },
      });
      return new Response(errorStream, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("[chat/route] Unhandled error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
