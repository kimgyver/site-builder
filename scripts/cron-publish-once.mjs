const baseUrl = (process.env.CRON_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const secret = process.env.CRON_SECRET?.trim();

const headers = secret
  ? {
      Authorization: `Bearer ${secret}`
    }
  : {};

const endpoint = `${baseUrl}/api/cron/publish`;

try {
  const response = await fetch(endpoint, {
    method: "GET",
    headers
  });

  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  if (!response.ok) {
    console.error("[cron:publish:once] failed", {
      status: response.status,
      payload
    });
    process.exit(1);
  }

  console.log("[cron:publish:once] ok", payload);
} catch (error) {
  console.error("[cron:publish:once] request error", error);
  process.exit(1);
}
