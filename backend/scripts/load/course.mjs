const baseUrl = process.env.LOAD_BASE_URL ?? "http://localhost:3000/api/v1";
const path = process.env.LOAD_PATH ?? "/course";
const durationSeconds = Number(process.env.LOAD_DURATION_SECONDS ?? "30");
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? "25");
const timeoutMs = Number(process.env.LOAD_TIMEOUT_MS ?? "5000");

const now = () => Number(process.hrtime.bigint()) / 1e6;

const percentile = (sorted, p) => {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
};

const worker = async (until) => {
  const latencies = [];
  let ok = 0;
  let fail = 0;

  while (Date.now() < until) {
    const start = now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${baseUrl}${path}`, { signal: controller.signal });
      if (res.ok) ok += 1;
      else fail += 1;
      await res.arrayBuffer().catch(() => undefined);
    } catch {
      fail += 1;
    } finally {
      clearTimeout(timer);
      latencies.push(now() - start);
    }
  }

  return { latencies, ok, fail };
};

const run = async () => {
  const until = Date.now() + durationSeconds * 1000;
  const results = await Promise.all(Array.from({ length: concurrency }, () => worker(until)));

  const latencies = results.flatMap((r) => r.latencies).sort((a, b) => a - b);
  const ok = results.reduce((sum, r) => sum + r.ok, 0);
  const fail = results.reduce((sum, r) => sum + r.fail, 0);
  const total = ok + fail;
  const rps = total / durationSeconds;

  // eslint-disable-next-line no-console
  console.log(JSON.stringify({
    target: `${baseUrl}${path}`,
    durationSeconds,
    concurrency,
    total,
    ok,
    fail,
    rps: Number(rps.toFixed(2)),
    latencyMs: {
      p50: Number(percentile(latencies, 50).toFixed(2)),
      p95: Number(percentile(latencies, 95).toFixed(2)),
      p99: Number(percentile(latencies, 99).toFixed(2)),
      max: Number((latencies[latencies.length - 1] ?? 0).toFixed(2))
    }
  }, null, 2));
};

await run();

