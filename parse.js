// The drop-in this competition races: parse(markdown) returns the HTML marked 18.1.3 renders with its
// default options (GFM on, async off), vendor/marked/marked.esm.js being marked's npm build byte for
// byte (MIT, vendor/marked/LICENSE). An entry's parse.js exports the same function, dependency-free,
// and must return the same string for every input.

import { marked } from './vendor/marked/marked.esm.js';

/** The HTML marked renders for `markdown`, with marked's defaults. */
export function parse(markdown) {
  return marked.parse(markdown);
}
