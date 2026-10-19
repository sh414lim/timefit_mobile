const WEB_APP_ORIGIN = process.env.TIMEFIT_WEB_ORIGIN || "https://timefit-omega.vercel.app";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

async function forwardReceiptProcess(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  let origin: URL;
  try {
    origin = new URL(WEB_APP_ORIGIN);
    if (origin.protocol !== "https:") throw new Error("invalid origin");
  } catch {
    return Response.json({ error: "영수증 분석 서버 설정을 확인해 주세요." }, { status: 503 });
  }

  const sourceUrl = new URL(request.url);
  const target = new URL("/api/receipt-process", origin);
  target.search = sourceUrl.search;

  try {
    const upstream = await fetch(target, {
      method: request.method,
      headers: { Authorization: authorization, "Content-Type": "application/json" },
      body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
      cache: "no-store",
      redirect: "manual",
    });
    return new Response(await upstream.arrayBuffer(), {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ error: "영수증 분석 서버에 연결하지 못했어요." }, { status: 502 });
  }
}

export const GET = forwardReceiptProcess;
export const POST = forwardReceiptProcess;
