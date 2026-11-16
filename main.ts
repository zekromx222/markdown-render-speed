// The house baseline of markdown-render-speed-01, and a starter: marked 18.1.3 itself. The harness runs
// `node /bot/main.ts` (node22). It reads every case from /input/cases.json (a JSON array of
// {id, markdown}), renders each one alone with parse() from parse.js, and writes /output/html.json: a
// JSON array of the HTML strings, one per case and in the cases' order. An entry keeps this driver and
// replaces parse.js with a faster module whose parse(markdown) returns the same string marked does.
// Outside a container MAKEFUN_INPUT_DIR and MAKEFUN_OUTPUT_DIR stand in for /input and /output.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const INPUT_DIR = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const OUTPUT_DIR = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const cases = JSON.parse(readFileSync(join(INPUT_DIR, 'cases.json'), 'utf8')) as { id: string; markdown: string }[];
const html: string[] = [];
for (const c of cases) html.push(parse(c.markdown));
writeFileSync(join(OUTPUT_DIR, 'html.json'), JSON.stringify(html));
