import fs from "node:fs";

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  // eslint-disable-next-line no-console
  console.error("Usage: node loadtest/render-k6-report.mjs <summary.json> <report.html>");
  process.exit(2);
}

const raw = fs.readFileSync(inputPath, "utf8");
const summary = JSON.parse(raw);

const get = (path, fallback = null) => {
  try {
    return path.split(".").reduce((acc, key) => acc?.[key], summary) ?? fallback;
  } catch {
    return fallback;
  }
};

const now = new Date().toISOString();
const checksPass = get("root_group.checks.passes", 0);
const checksFail = get("root_group.checks.fails", 0);
const httpReqs = get("metrics.http_reqs.values.count", 0);
const httpFailRate = get("metrics.http_req_failed.values.rate", 0);
const p95 = get("metrics.http_req_duration.values.p(95)", null);
const p99 = get("metrics.http_req_duration.values.p(99)", null);
const max = get("metrics.http_req_duration.values.max", null);

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>k6 Summary Report</title>
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; margin: 24px; color: #111; }
      h1 { font-size: 18px; margin: 0 0 12px; }
      .meta { color: #555; margin-bottom: 16px; }
      table { border-collapse: collapse; width: 100%; max-width: 760px; }
      td, th { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
      th { background: #f6f6f6; }
      code { background: #f6f6f6; padding: 2px 4px; border-radius: 4px; }
      .ok { color: #137333; font-weight: 600; }
      .bad { color: #b3261e; font-weight: 600; }
    </style>
  </head>
  <body>
    <h1>k6 Summary Report</h1>
    <div class="meta">Generated: <code>${now}</code></div>
    <table>
      <tr><th>Metric</th><th>Value</th></tr>
      <tr><td>HTTP requests</td><td>${httpReqs}</td></tr>
      <tr><td>HTTP failure rate</td><td>${(httpFailRate * 100).toFixed(3)}%</td></tr>
      <tr><td>Duration p95</td><td>${p95 == null ? "n/a" : `${p95.toFixed(2)}ms`}</td></tr>
      <tr><td>Duration p99</td><td>${p99 == null ? "n/a" : `${p99.toFixed(2)}ms`}</td></tr>
      <tr><td>Duration max</td><td>${max == null ? "n/a" : `${max.toFixed(2)}ms`}</td></tr>
      <tr><td>Checks</td><td><span class="${checksFail ? "bad" : "ok"}">${checksPass} pass</span>, <span class="${checksFail ? "bad" : ""}">${checksFail} fail</span></td></tr>
    </table>
    <p class="meta">Raw summary JSON: <code>${inputPath}</code></p>
  </body>
</html>`;

fs.writeFileSync(outputPath, html, "utf8");
// eslint-disable-next-line no-console
console.log(`Wrote ${outputPath}`);

