export async function POST(req: Request) {
  const apiKey = process.env.PIMLICO_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "PIMLICO_API_KEY is not configured on the server." }, { status: 500 });
  }

  const res = await fetch(`https://api.pimlico.io/v2/11155111/rpc?apikey=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await req.text(),
    cache: "no-store",
  });
  return new Response(await res.text(), {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  });
}
