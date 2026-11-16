/**
 * main.ts — driver for the make.fun "markdown-render-speed-02" bounty.
 *
 * Contract (the grading harness runs `node main.ts` in a container)
 * ---------------------------------------------------------------
 *   - Reads /input/cases.json (a JSON array of { id, markdown } objects).
 *   - Renders every `markdown` field via `parse()` from ./parse.js (a
 *     byte-exact fork of marked 18.1.3 with default options, GFM on).
 *   - Writes /output/html.json (a JSON array of HTML strings) preserving the
 *     exact input order — one entry per case, same index.
 *   - Exits non-zero, WITHOUT writing any output, on any error.
 *
 * Outside the container the same layout is exposed via the environment
 * variables MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR, so a local test run and
 * a container run behave identically. Resolution order: env var, else the
 * fixed '/input' and '/output' container mounts.
 *
 * Design notes
 * ------------
 *   - All markdown logic lives in ./parse.js. This file is pure I/O and
 *     bookkeeping — it contains no markdown knowledge of its own.
 *   - The output array is preallocated and filled strictly in input order,
 *     so case i always lands in slot i even if a later case throws.
 *   - Output is produced as a single compact JSON string (no pretty
 *     printing) and written with one writeFileSync, so the grader never
 *     observes a partial or half-written file.
 *   - Rendering is single-threaded and deterministic; the process keeps no
 *     state between cases, so repeated runs produce identical output.
 *   - On failure we log the reason to stderr and leave any pre-existing
 *     output file untouched (a crash is unranked — better to fail loudly
 *     than leave a malformed artifact).
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

/** One contest case as it appears in cases.json. */
interface Case {
  id: string;
  markdown: string;
}

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const INPUT_PATH = join(INPUT_DIR, 'cases.json');
const OUTPUT_PATH = join(OUTPUT_DIR, 'html.json');

/**
 * Read and validate the input file.
 *
 * We parse the JSON up front and shape-check every element so malformed
 * input fails loudly before we spend any render effort. The marker shape is
 * `{ id, markdown }`; only `markdown` is actually consumed, but the check
 * keeps contract violations visible early.
 */
function loadCases(): Case[] {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(INPUT_PATH, 'utf8'));
  } catch (err) {
    throw new Error(`cannot read ${INPUT_PATH}: ${String(err)}`);
  }

  if (!Array.isArray(raw)) {
    throw new Error(`expected a JSON array at the top level of ${INPUT_PATH}`);
  }

  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as { markdown?: unknown } | null;
    if (item === null || typeof item !== 'object' || typeof item.markdown !== 'string') {
      throw new Error(`case ${i} is malformed: markdown must be a string`);
    }
  }

  return raw as Case[];
}

/**
 * Render every case in input order into a preallocated array.
 *
 * Preallocation guarantees a deterministic slot for each case and avoids the
 * array growing during the hot loop. `parse` is pure w.r.t. its input, so no
 * state leaks between cases.
 */
function renderAll(cases: Case[]): string[] {
  const html = new Array<string>(cases.length);
  for (let i = 0; i < cases.length; i++) {
    html[i] = parse(cases[i].markdown);
  }
  return html;
}

/**
 * Serialize and write the output file.
 *
 * JSON.stringify of a plain array emits compact JSON (no whitespace), which
 * keeps the artifact small and byte-stable. A single synchronous write means
 * the file appears all at once.
 */
function writeOutput(html: string[]): void {
  writeFileSync(OUTPUT_PATH, JSON.stringify(html));
}

/** The full pipeline: load -> render -> write, then report. */
function main(): void {
  const cases = loadCases();
  const html = renderAll(cases);
  writeOutput(html);
  console.log(`rendered ${cases.length} cases -> ${OUTPUT_PATH}`);
}

try {
  main();
} catch (err) {
  console.error(err);
  process.exitCode = 1;
}
