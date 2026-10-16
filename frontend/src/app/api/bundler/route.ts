const PIMLICO_URL = `https://api.pimlico.io/v2/11155111/rpc?apikey=${process.env.PIMLICO_API_KEY}`;

export async function POST(req: Request) {
    const res = await fetch(PIMLICO_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: await req.text(), // the JSON-RPC request, unchanged
    });
    return new Response(await res.text(), { status: res.status, headers: { "content-type": "application/json" } });
}

