const SITE_ID = "main";

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

const supabaseRequest = async (path, options = {}) => {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) return null;
  return response.json();
};

const getContent = async () => {
  const rows = await supabaseRequest(
    `site_content?id=eq.${SITE_ID}&select=data,updated_at`
  );

  return rows[0] || null;
};

const updateContent = async (data) => {
  const rows = await supabaseRequest("site_content?id=eq.main&select=data,updated_at", {
    method: "PATCH",
    headers: {
      prefer: "return=representation",
    },
    body: JSON.stringify({
      data,
      updated_at: new Date().toISOString(),
    }),
  });

  return rows[0];
};

module.exports = async (request, response) => {
  try {
    if (request.method === "GET") {
      const content = await getContent();
      if (!content) return json(response, 404, { error: "Content not found" });
      return json(response, 200, content);
    }

    if (request.method === "PUT") {
      const body = await readJson(request);
      if (!body || typeof body.data !== "object" || Array.isArray(body.data)) {
        return json(response, 400, { error: "Expected { data: object }" });
      }

      const content = await updateContent(body.data);
      return json(response, 200, content);
    }

    return json(response, 405, { error: "Method not allowed" });
  } catch (error) {
    return json(response, 500, { error: error.message });
  }
};
