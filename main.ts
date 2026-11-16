/**
 * main.ts — make.fun "markdown-render-speed-02" submission driver.
 *
 * Contract
 * --------
 * The grading harness runs `node main.ts` inside a fresh container with two
 * mounted directories:
 *
 *   /input/cases.json   input: JSON array of { id, markdown } (720 cases)
 *   /output/html.json    our output: JSON array of HTML strings, one per
 *                        case, in exactly the same order as the input.
 *
 * Outside the container the same layout is exposed through the environment
 * variables MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR, so a container run and a
 * local test run behave identically. Fallback order: env var ?? '/input' /
 * '/output'.
 *
 * Design
 * ------
 * - All markdown logic lives in ./parse.js (a marked v18.1.3 fork tuned for
 *   this contest). This file only performs I/O, shape validation and
 *   bookkeeping — it contains no markdown logic of its own.
 * - The result array is preallocated and filled strictly in input order;
 *   parse() keeps no state between calls, so every case renders
 *   independently and deterministically.
 * - Output is written as one compact JSON array (no pretty-printing) in a
 *   single writeFileSync, so the grader never observes a partial file.
 * - On any error we exit non-zero WITHOUT writing the output file, and
 *   print the reason to stderr — a crash is unranked, so fail loudly
 *   rather than leave a malformed artifact behind.
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
 * Read and shape-check the input.
 * We validate the array up front so malformed data fails loudly, before any
 * rendering effort is spent.
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

/**
 * Render every case in input order; returns the parallel array of HTML
 * strings. Preallocation guarantees case i always lands at slot i even if
 * a later case throws.
 */
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
  console.error(err);
  process.exitCode = 1;
}
