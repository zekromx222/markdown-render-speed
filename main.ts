// make.fun markdown-render-speed-02 entry driver.
//
// The harness runs `node /bot/main.ts` inside a fresh container:
//   - /input/cases.json is a JSON array of { id, markdown } (720 cases)
//   - the program must write /output/html.json, a JSON array of the HTML
//     strings, one per case, in the same order
// Outside a container, MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR stand in
// for /input and /output.
//
// This driver is intentionally small: the work lives in parse.js. We only
// read the cases, render each one in order with parse(), and write the
// result back. parse() is called once per case and keeps nothing between
// calls, so the output for a case depends on nothing but the case itself.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

/** Directory the harness mounts the input set into. */
const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
/** Directory the harness expects the output file in. */
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const INPUT_FILE = join(INPUT_DIR, 'cases.json');
const OUTPUT_FILE = join(OUTPUT_DIR, 'html.json');

function main() {
  const cases = JSON.parse(readFileSync(INPUT_FILE, 'utf8')) as { id: string; markdown: string }[];

  if (!Array.isArray(cases)) {
    throw new Error('input is not an array');
  }

  const html: string[] = new Array<string>(cases.length);

  for (let i = 0; i < cases.length; i++) {
    const c = cases[i];
    if (typeof c !== 'object' || c === null || typeof c.markdown !== 'string') {
      throw new Error(`case ${i} is malformed`);
    }
    html[i] = parse(c.markdown);
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(html));
}

try {
  main();
} catch (err) {
  // A crash is unranked; fail loudly rather than write a partial file.
  console.error(err);
  process.exitCode = 1;
}
