const intervalMs = Number.parseInt(process.env.CRON_INTERVAL_MS || "60000", 10);

if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
  console.error(
    "[cron:publish:watch] invalid CRON_INTERVAL_MS",
    process.env.CRON_INTERVAL_MS
  );
  process.exit(1);
}

const baseUrl = (process.env.CRON_BASE_URL || "http://localhost:3000").replace(
  /\/$/,
  ""
);
const secret = process.env.CRON_SECRET?.trim();
const endpoint = `${baseUrl}/api/cron/publish`;

const headers = secret
  ? {
      Authorization: `Bearer ${secret}`
    }
  : {};

let running = false;

async function tick() {
  if (running) return;
  running = true;
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
      console.error("[cron:publish:watch] failed", {
        status: response.status,
        payload,
        at: new Date().toISOString()
      });
    } else {
      console.log("[cron:publish:watch] ok", {
        payload,
        at: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("[cron:publish:watch] request error", error);
  } finally {
    running = false;
  }
}

console.log("[cron:publish:watch] started", {
  endpoint,
  intervalMs,
  auth: secret ? "bearer" : "none"
});

await tick();
setInterval(tick, intervalMs);
