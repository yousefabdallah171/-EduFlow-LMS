import { readFileSync } from "node:fs";
import { join } from "node:path";

const localeFiles = ["en.json", "ar.json"];
const localeDir = join(process.cwd(), "src", "locales");
const mojibakePattern = /(?:Ã.|Â.|â[^\s"]*|Ø.|Ù.|ðŸ)/u;

const readLocale = (file) => {
  const path = join(localeDir, file);
  const raw = readFileSync(path, "utf8");
  return { path, raw, json: JSON.parse(raw) };
};

const flatten = (value, prefix = "") => {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flatten(item, `${prefix}[${index}]`));
  }

  if (value && typeof value === "object") {
    return Object.entries(value).flatMap(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key));
  }

  return [prefix];
};

const topLevelDuplicates = (raw) => {
  const duplicates = [];
  const seen = new Set();
  let depth = 0;
  let inString = false;
  let escaped = false;
  let token = "";
  let possibleKey = null;

  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === "\"") {
        inString = false;
        possibleKey = token;
        token = "";
      } else {
        token += char;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      token = "";
      continue;
    }

    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;

    if (depth === 1 && char === ":" && possibleKey) {
      if (seen.has(possibleKey)) {
        duplicates.push(possibleKey);
      }
      seen.add(possibleKey);
      possibleKey = null;
    }

    if (char === "," || char === "\n") {
      possibleKey = null;
    }
  }

  return duplicates;
};

const locales = Object.fromEntries(localeFiles.map((file) => [file, readLocale(file)]));
const failures = [];

for (const [file, locale] of Object.entries(locales)) {
  const duplicates = topLevelDuplicates(locale.raw);
  if (duplicates.length) {
    failures.push(`${file} duplicate top-level keys: ${[...new Set(duplicates)].join(", ")}`);
  }

  if (mojibakePattern.test(locale.raw)) {
    failures.push(`${file} contains mojibake-looking text. Re-save the affected copy as real UTF-8.`);
  }
}

const enKeys = new Set(flatten(locales["en.json"].json));
const arKeys = new Set(flatten(locales["ar.json"].json));
const missingInAr = [...enKeys].filter((key) => !arKeys.has(key));
const missingInEn = [...arKeys].filter((key) => !enKeys.has(key));

if (missingInAr.length) {
  failures.push(`ar.json missing keys: ${missingInAr.slice(0, 40).join(", ")}`);
}

if (missingInEn.length) {
  failures.push(`en.json missing keys: ${missingInEn.slice(0, 40).join(", ")}`);
}

if (failures.length) {
  console.error("i18n audit failed:");
  for (const failure of failures) {
    console.error(` - ${failure}`);
  }
  process.exit(1);
}

console.log("i18n audit passed.");
