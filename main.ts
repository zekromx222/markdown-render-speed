/**
 * main.ts — make.fun "markdown-render-speed-02" entry driver.
 *
 * The grading harness launches `node main.ts` inside a fresh container with
 * two mounted directories:
 *
 *   /input/cases.json   input: JSON array of { id, markdown } (720 cases)
 *   /output/html.json    our output: JSON array of HTML strings, one per
 *                        case, in exactly the same order as the input
 *
 * Outside the container the same contract is available through the
 * MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR environment variables. When they
 * are unset we fall back to /input and /output, so a container run and a
 * local test run behave identically.
 *
 * Design notes:
 *   - All rendering is delegated to parse.js, a self-contained fork of the
 *     marked v18.1.3 engine. This file only performs I/O and bookkeeping —
 *     it deliberately contains no markdown logic of its own.
 *   - The result array is preallocated and filled in strict input order.
 *     parse() keeps no state between calls, so every case renders
 *     independently and deterministically.
 *   - Output is written atomically (single writeFileSync at the end). If
 *     anything goes wrong we exit non-zero without touching the output
 *     file, rather than writing a partial or malformed artifact.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

/** One contest case as it arrives in cases.json. */
type Case = { id: string; markdown: string };

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const INPUT_FILE = join(INPUT_DIR, 'cases.json');
const OUTPUT_FILE = join(OUTPUT_DIR, 'html.json');

/**
 * Read and validate the contest input.
 * We check the array shape up front so a malformed input fails loudly and
 * early, before any rendering work is spent.
 */
function loadCases(): Case[] {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(INPUT_FILE, 'utf8'));
  } catch (err) {
    throw new Error(`cannot read ${INPUT_FILE}: ${String(err)}`);
  }

  if (!Array.isArray(raw)) {
    throw new Error(`expected a JSON array at top level in ${INPUT_FILE}`);
  }

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i] as { markdown?: unknown } | null;
    if (typeof c !== 'object' || c === null || typeof c.markdown !== 'string') {
      throw new Error(`case ${i} is malformed (markdown must be a string)`);
    }
  }

  return raw as Case[];
}

/** Render every case in order; returns the parallel array of HTML strings. */
function renderAll(cases: Case[]): string[] {
  const html = new Array<string>(cases.length);
  for (let i = 0; i < cases.length; i++) {
    html[i] = parse(cases[i].markdown);
  }
  return html;
}

/** Write the final artifact as compact JSON (no extra whitespace). */
function writeOutput(html: string[]): void {
  writeFileSync(OUTPUT_FILE, JSON.stringify(html));
}

/** Wire everything together and report what was done. */
function main(): void {
  const cases = loadCases();
  const html = renderAll(cases);
  writeOutput(html);
  console.log(`rendered ${cases.length} cases -> ${OUTPUT_FILE}`);
}

try {
  main();
} catch (err) {
  // A crash is unranked; fail loudly rather than leave a partial file.
  console.error(err);
  process.exitCode = 1;
}
