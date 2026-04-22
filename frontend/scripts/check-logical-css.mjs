import { readFileSync } from "node:fs";
import { join } from "node:path";
import { globSync } from "glob";

const sourcePatterns = [/\bmargin-left\b/i, /\bmargin-right\b/i, /\bpadding-left\b/i, /\bpadding-right\b/i];
const cssPatterns = [/^\s*left\s*:/im, /^\s*right\s*:/im, ...sourcePatterns];

const files = globSync("src/**/*.{ts,tsx,css}", {
  cwd: process.cwd(),
  absolute: true,
  ignore: []
});

const violations = [];

for (const file of files) {
  const content = readFileSync(file, "utf8");
  const patterns = file.endsWith(".css") ? cssPatterns : sourcePatterns;

  for (const pattern of patterns) {
    if (pattern.test(content)) {
      violations.push(join(file));
      break;
    }
  }
}

if (violations.length > 0) {
  console.error("Logical CSS check failed in:");
  for (const file of violations) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}
