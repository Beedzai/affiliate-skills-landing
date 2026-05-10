const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
};

const readJson = (request) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    return json(response, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readJson(request);
    const path = String(body.path || "/").slice(0, 500);
    const referrer = body.referrer ? String(body.referrer).slice(0, 1000) : null;
    const visitorId = body.visitorId ? String(body.visitorId).slice(0, 120) : null;
    const userAgent = String(request.headers["user-agent"] || "").slice(0, 1000);

    const supabaseResponse = await fetch(`${process.env.SUPABASE_URL}/rest/v1/analytics_events`, {
      method: "POST",
      headers: {
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        "content-type": "application/json",
        prefer: "return=minimal",
      },
      body: JSON.stringify({
        site_id: "main",
        event_type: "pageview",
        path,
        referrer,
        visitor_id: visitorId,
        user_agent: userAgent,
      }),
    });

    if (!supabaseResponse.ok) {
      throw new Error(`Supabase ${supabaseResponse.status}: ${await supabaseResponse.text()}`);
    }

    return json(response, 200, { ok: true });
  } catch (error) {
    return json(response, 500, { error: error.message });
  }
};
