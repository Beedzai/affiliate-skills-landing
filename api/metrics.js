const json = (response, statusCode, body) => {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store");
  response.end(JSON.stringify(body));
};

const getEvents = async () => {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const url = `${process.env.SUPABASE_URL}/rest/v1/analytics_events?site_id=eq.main&event_type=eq.pageview&created_at=gte.${encodeURIComponent(since)}&select=path,referrer,visitor_id,created_at&order=created_at.desc&limit=10000`;
  const response = await fetch(url, {
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${await response.text()}`);
  }

  return response.json();
};

const countSince = (events, days) => {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return events.filter((event) => new Date(event.created_at).getTime() >= cutoff).length;
};

const topCounts = (events, key) => {
  const counts = new Map();
  for (const event of events) {
    const value = event[key] || (key === "referrer" ? "Truy cap truc tiep" : "/");
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
};

module.exports = async (request, response) => {
  if (request.method !== "GET") {
    return json(response, 405, { error: "Method not allowed" });
  }

  try {
    const events = await getEvents();
    const visitors = new Set(events.map((event) => event.visitor_id).filter(Boolean));
    const todayKey = new Date().toISOString().slice(0, 10);

    return json(response, 200, {
      total30d: events.length,
      today: events.filter((event) => event.created_at.startsWith(todayKey)).length,
      last7d: countSince(events, 7),
      unique30d: visitors.size,
      topPages: topCounts(events, "path"),
      topReferrers: topCounts(events, "referrer"),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return json(response, 500, { error: error.message });
  }
};
