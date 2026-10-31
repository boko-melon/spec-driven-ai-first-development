---
name: run-evals
description: A/B evaluate an agent skill — resolve it from sources with the shared resolver, run each eval case several times with and without the skill, grade against its assertions, measure run-to-run variance, and append a stamp keyed by (skill, context_hash, model, cases_hash) to the stamp log. Use when the user wants to evaluate a skill, run evals, benchmark a skill, compare with/without skill, evaluate a skill under a specific model, measure eval variance or noise, or check trigger accuracy.
---

# Run Evals

Evaluate a skill by running each eval case N times with the skill and (when building the baseline) without, grading each run against the skill's assertions. Each invocation appends stamps to the skill's `evals/stamps.jsonl`.

Requires `evals/evals.json` under the skill's source directory. Optional: `evals/files/` (case inputs), `evals/trigger-evals.json` (activation testing).

## Options

| Flag           | Default | Effect                                                                                                             |
| -------------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| `--runs N`     | `3`     | Runs per configuration per eval.                                                                                   |
| `--rebaseline` | —       | Regenerate the baseline even if a valid one exists for this (model, cases_hash).                                   |
| `--debug`      | —       | Keep subagent artifacts under `{skill_dir}/evals/outputs/{model}/` instead of a temp dir discarded after analysis. |

## Subagents

Subagents run via `runSubagent` — one call per run, concurrent where supported. They return only their final text, so `model` is the value you assert.

## Workflow

### 1. Pick the skill

Glob `skills-src/*/evals/evals.json` (relative to the repo root) and match the request against the skill directory names. Only if no skill can be inferred, list each skill with its eval count and ask. Note any flags.

Bind `{skill_dir}` to the **absolute** path of the skill's source directory (the parent of `evals/`). Each `eval.files` entry resolves as `{skill_dir}/{file}`.

### 2. Resolve skills and compute identity

Run the shared resolver (`scripts/skill-resolver.js`) over **all** skills in `skills-src/`, letting it mint the workspace:

```bash
node scripts/skill-resolver.js resolve --new-workspace
```

- The resolver creates a uniquely named temp directory, resolves every skill into `{workspace}/skills/{skill}/SKILL.md`, and prints `WORKSPACE={workspace}` as its first stdout line. Bind `{workspace}` to that path. A fresh directory is minted per invocation, so no leftover workspace is ever reused — don't construct the path yourself.
- Bind `{context_hash}` to the target skill's `context_hash` in `{workspace}/manifest.json`.
- Resolve failure (a link that does not resolve to a file) → stop and report.

Never read the built skills directory — always resolve fresh from sources.

Bind `{cases_hash}`: sha256 over the normalized contents of `evals.json`, `trigger-evals.json` (if present), and every file under `evals/files/`, in sorted path order.

Discard the workspace after step 9 unless `--debug` — including when the run aborts early (see Errors).

### 3. Resolve the baseline

Baseline identity is `(model, cases_hash)` — no context_hash. Look it up in `stamps.jsonl`. Set `regenerate_baseline`:

- **true** if no baseline stamp exists for this (model, cases_hash), `--rebaseline` was passed, or `--runs > 1` and the existing baseline stamp has no `stddev` fields.
- Otherwise **false** — reuse it and skip the without-skill runs.

### 4. Run

Define `{output_dir}`: `{skill_dir}/evals/outputs/{model}/` with `--debug`, otherwise `{workspace}/outputs/{model}/` — a subdirectory of the workspace the resolver already created, so no second temp dir is needed. Replace path-unsafe characters in the `{model}` segment (`:` → `-`); stamps keep the exact value. In the non-debug case it is discarded together with `{workspace}` after step 9; there is nothing separate to clean up.

For each eval, launch **N with-skill subagents** (one per run). Launch N without-skill subagents too, but only if `regenerate_baseline`. Launch one `runSubagent` call per run, running everything concurrently where supported. The prompt is identical across an eval's runs — only the `run-{r}/` output path changes; that path is the canonical run identifier.

Every eval task is written as if it were a real change to this repo ("add this to atoms", "refactor our PriceCard"), so a subagent will default to editing the live working tree — and with N runs launched concurrently, they'll all land on the same real files and race each other. The prompt must make the sandbox boundary explicit and non-negotiable: reads from the real repo are fine (and expected, for conventions/context), writes are not.

With skill (run `r` of N):

```
Execute this task.
IMPORTANT: Read {workspace}/skills/{skill}/SKILL.md first and follow it completely.
Task: {eval.prompt}
{if eval.files: Read these input files first: {eval.files resolved to absolute paths}}
Sandbox rules — read carefully: you may READ any file in this repository for context and convention (existing components, tokens, config), but you must NOT create, edit, or delete any file inside the repository working tree. Write every file you produce under {output_dir}/current/eval-{eval.name}/run-{r}/ instead, using the same relative path it would have in the real repo (e.g. a component you'd normally place at src/components/atoms/Foo/Foo.tsx goes to {output_dir}/current/eval-{eval.name}/run-{r}/src/components/atoms/Foo/Foo.tsx). Do not run build/test commands that write inside the real repo tree (e.g. via watch mode or codegen) — if you need to verify your work, run tests against the copies under your run folder. This is a concurrent, isolated eval run; other runs are touching this same repo checkout right now, so any write outside your run folder will corrupt this and other runs.
You are running standalone and cannot receive a reply. Do not call any tool that blocks waiting for user input (e.g. clarifying-question prompts). If the task requires asking the user something, write the question(s) directly in your final response instead.
```

Without skill (run `r` of N):

```
Execute this task. Do NOT read any skill files — work from your own knowledge only.
Task: {eval.prompt}
{if eval.files: Read these input files first: {eval.files resolved to absolute paths}}
Sandbox rules — read carefully: you may READ any file in this repository for context and convention (existing components, tokens, config), but you must NOT create, edit, or delete any file inside the repository working tree. Write every file you produce under {output_dir}/baseline/eval-{eval.name}/run-{r}/ instead, using the same relative path it would have in the real repo (e.g. a component you'd normally place at src/components/atoms/Foo/Foo.tsx goes to {output_dir}/baseline/eval-{eval.name}/run-{r}/src/components/atoms/Foo/Foo.tsx). Do not run build/test commands that write inside the real repo tree (e.g. via watch mode or codegen) — if you need to verify your work, run tests against the copies under your run folder. This is a concurrent, isolated eval run; other runs are touching this same repo checkout right now, so any write outside your run folder will corrupt this and other runs.
You are running standalone and cannot receive a reply. Do not call any tool that blocks waiting for user input (e.g. clarifying-question prompts). If the task requires asking the user something, write the question(s) directly in your final response instead.
```

### 5. Record the model

Bind `{model}` to the model id you assert for the subagents, from your best knowledge (subagent self-reports are never a source). Use it verbatim in stamps and paths. No determinable model → no stamp.

### 6. Grade

Grade each run independently: a per-assertion verdict (pass / fail, one-line grader note per fail) and the run's pass rate (assertions passed / total). Both the pass rates and the per-assertion verdicts feed the stamp and the report.

### 7. Analyze — variance

> The goal here is to tell a real improvement from natural variance. We measure how much the skill lifts the mean pass rate (`delta`) and compare that lift against how noisy the runs themselves are (`noise_floor`). A delta bigger than the noise is plausibly real; a delta smaller than the noise could just be chance.

Per eval and configuration, compute `{mean, stddev, min, max}` of pass rate across the N runs. `delta = mean_with − mean_baseline`; a reused baseline's stats come from its stamp.

`noise_floor = sqrt(stddev_with² + stddev_baseline²)`. The `noise_floor_verdict` is `"pass"` when `delta > noise_floor` (a coarse ~1σ heuristic, not a significance test), otherwise `"fail"`. If the baseline has no stddev the floor is one-sided, and when it collapses to 0 the result is unreliable — recommend `--rebaseline`. `delta`, `noise_floor`, and `noise_floor_verdict` are frozen into the `with_skill` stamp.

### 8. Trigger evals

If `trigger-evals.json` exists: extract every sibling skill's `description` from the resolved workspace frontmatter (`{workspace}/skills/*/SKILL.md`), then for each query ask an LLM-as-judge which skills should activate, returned by directory name. A query passes when the target skill (`{skill_dir}`'s basename) appears in the judge's set if `should_trigger` is true. Compute recall (correctly triggered / total should-trigger) and precision (correctly triggered / (correctly triggered + false activations)); list every mismatch. Skip if the file is absent.

### 9. Stamp and report

**Append stamps** to `{skill_dir}/evals/stamps.jsonl` — committed, append-only, one JSON object per line. Never rewrite, delete, nest, or group existing lines. Stamp every run, pass or fail:

- One `with_skill` stamp: `(skill_id, context_hash, model, cases_hash)` + per-eval stats, per-assertion verdicts, and trigger block.
- One `baseline` stamp if the baseline was regenerated: `(skill_id, model, cases_hash)`, `context_hash: null`, per-eval stats and per-assertion verdicts, no trigger block.

Commit new stamps together with the skill and linked-doc changes they evaluate.

**Report:**

- **Headline** — the model evaluated, with-skill mean ± stddev, baseline mean ± stddev, delta, and the noise-floor verdict (pass/fail), plus the stamped context_hash (short form). If the floor is unreliable, say so plainly. At `--runs 1`, state there is no noise floor.
- **Per-eval table** — name, baseline mean, with-skill mean ± stddev, delta.
- **Failing assertions** — for every eval that failed any assertion, the assertion text and how many of the N runs failed it.
- **Trigger** — precision, recall, and any mismatched queries, if it ran.

## Errors

- Resolve failure → stop before launching anything; report the broken reference.
- Subagent produces nothing → that run scores 0; flag it in the report.
- Model mismatch across a configuration's runs, or between the two configurations of an invocation → abort without stamping.
- Malformed `evals.json` → stop and report.
- All runs of a configuration fail identically → check for a setup problem (missing input file, wrong path) before trusting the score.
- A subagent's final response indicates it wrote inside the real repo tree (e.g. mentions the actual `src/...` path rather than the run folder, or reports files being overwritten by a "concurrent process") → abort the whole invocation without stamping. Results are unreliable once runs can race on shared files; check `git status` for stray changes under the repo (outside `evals/outputs/` and `evals/stamps.jsonl`) and decide with the user whether to discard them before retrying.
- Any abort or early stop → still delete `{workspace}` (unless `--debug`) before ending; that also removes the non-debug `{output_dir}` nested inside it. A failed run is not an excuse to leave temp files behind.

## File formats

### Stamp record (one line in {skill_dir}/evals/stamps.jsonl)

```json
{
  "skill_id": "write-frontend",
  "kind": "with_skill",
  "context_hash": "sha256:ab3f12…",
  "model": "claude-opus-4-8",
  "cases_hash": "sha256:9e44c1…",
  "runs_per_eval": 3,
  "timestamp": "2026-07-09T12:30:00Z",
  "overall": {
    "pass_rate": { "mean": 0.95, "stddev": 0.029 },
    "delta": 0.12,
    "noise_floor": 0.041,
    "noise_floor_verdict": "pass"
  },
  "evals": [
    {
      "name": "data-flow-for-implementation-guide",
      "runs": 3,
      "pass_rate": { "mean": 0.83, "stddev": 0.24, "min": 0.5, "max": 1.0 },
      "delta": 0.17,
      "run_details": [
        {
          "run": 1,
          "pass_rate": 0.5,
          "assertions": [
            { "assertion": "Produces a data-flow section", "verdict": "pass" },
            {
              "assertion": "Names the source module",
              "verdict": "fail",
              "note": "Referred to the module by feature name only, not the file path."
            }
          ]
        }
      ]
    }
  ],
  "trigger": {
    "precision": 0.9091,
    "recall": 1.0,
    "total": 20,
    "passed": 19,
    "failed_queries": [
      {
        "query": "help me debug this Mermaid syntax error",
        "should_trigger": false,
        "did_trigger": true,
        "matched_skills": ["write-diagram"]
      }
    ]
  }
}
```

Baseline stamps have `"kind": "baseline"`, `"context_hash": null`, and no `trigger` block.

Rules:

- Stamps hold identity keys, raw measurements, per-assertion grading detail (`run_details`), and frozen comparison snapshots (`delta`, `noise_floor`, `noise_floor_verdict`).
- `delta`, `noise_floor`, and `noise_floor_verdict` are a run-time snapshot on `with_skill` stamps only — frozen against the baseline used at run time (the latest matching `(model, cases_hash)` baseline), never re-derived from later baselines or trusted as raw. `noise_floor_verdict` is `"pass"` (delta exceeds the noise floor) or `"fail"`.
- Grader notes in `run_details` are free-text observations recorded for history — never parsed back as authoritative measurements.
- Omit the `trigger` block when trigger evals didn't run — absent, never null.
- `model` matching is exact-string throughout.
- `timestamp` is the actual write time — never a rounded placeholder.

### Directory layout

```
repo/
├── skills-src/
│   └── {skill}/
│       ├── SKILL.md              # source; links docs relative to this file
│       └── evals/
│           ├── evals.json
│           ├── trigger-evals.json   # optional
│           ├── files/               # optional inputs (covered by cases_hash)
│           └── stamps.jsonl         # committed, append-only
└── scripts/
    └── skill-resolver.js                # shared resolver
```

With `--debug`, subagent artifacts are kept under `{skill_dir}/evals/outputs/{model}/{baseline,current}/eval-{name}/run-{r}/`, along with the resolved workspace. Git-ignore `outputs/` and the workspace.

## Input files

### evals.json

```json
{
  "evals": [
    {
      "id": 1,
      "name": "kebab-case-eval-name",
      "prompt": "The exact prompt given to the agent (identical for with/without runs)",
      "files": ["evals/files/path/to/input-file.ts"],
      "assertions": [
        "A specific, verifiable claim about the output",
        "Another claim"
      ]
    }
  ]
}
```

| Field        | Required | Description                                                                      |
| ------------ | -------- | -------------------------------------------------------------------------------- |
| `id`         | Yes      | Unique integer within the file                                                   |
| `name`       | Yes      | Kebab-case; used in output dir names (`eval-{name}`)                             |
| `prompt`     | Yes      | The task prompt, identical for both runs                                         |
| `files`      | No       | Input file paths, relative to the skill directory; omit when the case needs none |
| `assertions` | Yes      | Verifiable claims to grade against                                               |

### trigger-evals.json

```json
[
  {
    "query": "draw me a picture of how the search components connect",
    "should_trigger": true
  },
  {
    "query": "help me debug this Mermaid syntax error",
    "should_trigger": false
  }
]
```
