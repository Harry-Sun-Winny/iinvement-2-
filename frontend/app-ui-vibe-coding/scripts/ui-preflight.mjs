#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from "node:fs";
import { extname, relative, resolve } from "node:path";

const root = process.cwd();
const inputs = process.argv.slice(2);

if (inputs.length === 0) {
  console.error("Usage: node ui-preflight.mjs <changed file or directory> [...]");
  process.exit(2);
}

const allowedExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const warnings = [];
const errors = [];

function walk(path) {
  const stat = statSync(path);
  if (stat.isFile()) return [path];
  return readdirSync(path, { withFileTypes: true }).flatMap((entry) =>
    entry.name === "node_modules" || entry.name === ".next"
      ? []
      : walk(resolve(path, entry.name)),
  );
}

const files = inputs
  .flatMap((input) => walk(resolve(root, input)))
  .filter((file) => allowedExtensions.has(extname(file)));

const checks = [
  {
    pattern: /\bh-screen\b/g,
    message: "Use min-h-[100dvh] for new full-height mobile-capable surfaces.",
  },
  {
    pattern: /window\.addEventListener\(\s*["']scroll["']/g,
    message: "Avoid raw scroll listeners; use CSS, IntersectionObserver, Motion, or ScrollTrigger.",
  },
  {
    pattern: /<(?:svg|path)\b/g,
    message: "Prefer the established lucide-react icon family over hand-written SVG icons.",
  },
  {
    pattern: /transition-all/g,
    message: "Prefer explicit transition properties when practical.",
  },
];

for (const file of files) {
  const source = readFileSync(file, "utf8");
  const display = relative(root, file);

  for (const check of checks) {
    for (const match of source.matchAll(check.pattern)) {
      const line = source.slice(0, match.index).split(/\r?\n/).length;
      warnings.push(`${display}:${line} ${check.message}`);
    }
  }

  if (/\.(?:tsx|jsx)$/.test(file) && /className=/.test(source)) {
    const hasFocus = /focus-visible:/.test(source);
    const hasInteractive = /<(?:button|a)\b/.test(source);
    if (hasInteractive && !hasFocus) {
      warnings.push(`${display} Interactive elements found without an obvious focus-visible style; verify shared primitives or add one.`);
    }
  }
}

const required = [
  "app/styles.css",
  "components/providers/ThemeProvider.tsx",
  "lib/design-tokens.ts",
];

for (const path of required) {
  try {
    statSync(resolve(root, path));
  } catch {
    errors.push(`Missing interface-contract source: ${path}`);
  }
}

console.log(`UI preflight scanned ${files.length} file(s).`);
for (const warning of warnings) console.log(`WARN ${warning}`);
for (const error of errors) console.error(`ERROR ${error}`);
console.log(`${errors.length} error(s), ${warnings.length} warning(s).`);

process.exit(errors.length > 0 ? 1 : 0);
