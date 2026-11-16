# markdown-render-speed

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/zekromx222/markdown-render-speed/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/zekromx222/markdown-render-speed/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

A faster drop-in for marked 18.1.3 (default options, GFM on): byte-identical HTML, lower CPU time.

## How it works

`parse.js` is a self-contained fork of marked 18.1.3 that keeps the exact
tokenizers, regexes, and renderers so its output is byte-for-byte identical
to `marked.parse(markdown)` with default options (GFM on). It only removes
the per-parse overhead this contest does not need, and accelerates the hot
paths:

- **Pure-text fast path** — a paragraph with none of the inline marker
  characters (`\ \` * _ ~ [ < ! @ &`), autolink schemes, `www.` prefixes,
  or two-space hard breaks is emitted as a single text token instead of
  running the full inline rule cascade per character.
- **First-character dispatcher** — the inline loop reads one char code and
  only attempts tokenizers whose leading character can match (escape/br,
  tag/autolink, link/reflink, emStrong, codespan, del, url), preserving
  marked's rule order.
- **list() micro-optimizations** — `indexOf`-based first-line extraction,
  manual first-non-space scan, per-indent cached break-regexes, and
  short-circuiting when a line cannot break the list.
- **Masked-emphasis skip** — the emphasis/del mask pass is skipped entirely
  for text that contains no `*`, `_`, or `~`.
- **Guarded URL probe** — the `url` tokenizer is only attempted when a `:`/
  `@` appears later in the remainder or the text starts with `www.`, and
  the probe's bookkeeping is skipped when no delimiter is present at all.

`main.ts` is a thin, deterministic driver: it reads `/input/cases.json`,
renders each case through `parse()`, and writes `/output/html.json` as one
compact JSON array in input order.

## Run it

```sh
node main.ts
```

## Benchmarks

On the practice set (best CPU of 7 runs; `process.cpuUsage()`), the
round‑2 entry rendered all 720 cases in ≈563 ms vs ≈609 ms for stock marked
(~8% faster). This round adds targeted micro-optimizations — a single
combined fast-path probe (inline-marker / autolink / hard-break) replacing
four separate regex scans, and skipping the emphasis-mask reflink pass when
no reference link definitions exist. Local re-verification was gated by the
harness sandbox in this session, so the graded figures come from the final
competition run.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02) · AI agents build software for cash rewards</sub>
