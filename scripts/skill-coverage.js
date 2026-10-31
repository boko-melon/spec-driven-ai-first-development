"use strict";

/**
 * skill-coverage — the CI eval-coverage gate.
 *
 * skill-check.js answers "is THIS skill approved for the running model" during a
 * session; this answers "is EVERY evaluated skill still stamped at its current
 * context hash" for a pull request. It computes each skill's context_hash fresh
 * from working-tree sources (never a committed manifest — the build is gitignored)
 * and fails if any in-scope skill has no committed `with_skill` stamp at that hash.
 *
 * Derived staleness does the work: edit a linked doc and the hash of every skill
 * that links to it changes, so their old stamps no longer match and they show up
 * as UNCOVERED here — blocking the merge until the evals are re-run and re-stamped.
 *
 * A skill is in scope iff it declares evals (`evals/evals.json`). Skills without
 * evals are reported as skipped, not failed. Coverage is model-agnostic by default
 * (any stamp at the current hash counts); pass `--models a,b` (or set
 * SKILL_EVAL_MODELS) to require a stamp per listed model.
 */

const fs = require("fs");
const path = require("path");

const { BuildError, SRC_DIR, resolveSkill } = require("./skill-resolver");
const { readWithSkillStamps, normalizeModel } = require("./skill-check");

/**
 * Check eval-stamp coverage for every evaluated skill under `srcDir`. Returns
 * `{ results, ok }`; `ok` is false when any in-scope skill is UNCOVERED or fails
 * to resolve. `results` carries one entry per skill with its `state`:
 * COVERED | UNCOVERED | RESOLVE_ERROR | SKIPPED_NO_EVALS.
 */
function checkCoverage({ srcDir = SRC_DIR, requiredModels = [] } = {}) {
  const skillNames = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(srcDir, name, "SKILL.md")))
    .sort((a, b) => a.localeCompare(b));

  const results = [];
  for (const skillName of skillNames) {
    const skillDir = path.join(srcDir, skillName);

    if (!fs.existsSync(path.join(skillDir, "evals", "evals.json"))) {
      results.push({ skill: skillName, state: "SKIPPED_NO_EVALS" });
      continue;
    }

    let currentHash;
    try {
      ({ context_hash: currentHash } = resolveSkill({
        srcText: fs.readFileSync(path.join(skillDir, "SKILL.md"), "utf8"),
        skillName,
        skillDir,
      }));
    } catch (err) {
      results.push({
        skill: skillName,
        state: "RESOLVE_ERROR",
        error: err.message,
      });
      continue;
    }

    const sameHash = readWithSkillStamps(
      path.join(skillDir, "evals", "stamps.jsonl"),
    ).filter((s) => s.context_hash === currentHash);
    const stampedModels = [
      ...new Set(sameHash.map((s) => normalizeModel(s.model))),
    ];

    let state;
    let missingModels = [];
    if (requiredModels.length > 0) {
      missingModels = requiredModels.filter(
        (m) =>
          !sameHash.some((s) => normalizeModel(s.model) === normalizeModel(m)),
      );
      state = missingModels.length > 0 ? "UNCOVERED" : "COVERED";
    } else {
      state = sameHash.length > 0 ? "COVERED" : "UNCOVERED";
    }

    results.push({
      skill: skillName,
      state,
      contextHash: currentHash,
      stampedModels,
      missingModels,
    });
  }

  const ok = !results.some(
    (r) => r.state === "UNCOVERED" || r.state === "RESOLVE_ERROR",
  );
  return { results, ok };
}

function shortHash(hash) {
  return hash ? hash.replace(/^sha256:/, "").slice(0, 12) : "none";
}

function formatReport({ results, ok }, { requiredModels = [] } = {}) {
  const lines = [];
  const by = (state) => results.filter((r) => r.state === state);

  lines.push("Skill eval-stamp coverage");
  lines.push(
    requiredModels.length > 0
      ? `Required models: ${requiredModels.join(", ")}`
      : "Coverage: model-agnostic (any stamp at the current hash counts).",
  );
  lines.push("");

  for (const r of results) {
    if (r.state === "COVERED") {
      lines.push(
        `  ✓ ${r.skill} — sha256:${shortHash(r.contextHash)} [${r.stampedModels.join(", ")}]`,
      );
    } else if (r.state === "UNCOVERED") {
      const why = r.missingModels.length
        ? `missing stamp for: ${r.missingModels.join(", ")}`
        : "no stamp at current context hash";
      lines.push(
        `  ✗ ${r.skill} — sha256:${shortHash(r.contextHash)} — ${why}`,
      );
    } else if (r.state === "RESOLVE_ERROR") {
      lines.push(`  ✗ ${r.skill} — RESOLVE ERROR: ${r.error}`);
    } else {
      lines.push(`  · ${r.skill} — skipped (no evals.json)`);
    }
  }

  lines.push("");
  const counts = {
    covered: by("COVERED").length,
    uncovered: by("UNCOVERED").length,
    errored: by("RESOLVE_ERROR").length,
    skipped: by("SKIPPED_NO_EVALS").length,
  };
  lines.push(
    `${counts.covered} covered, ${counts.uncovered} uncovered, ${counts.errored} resolve-error, ${counts.skipped} skipped.`,
  );
  lines.push(
    ok
      ? "PASS — every evaluated skill has a stamp at its current context hash."
      : "FAIL — re-run and commit evals for the skills above before merging.",
  );
  return lines.join("\n");
}

module.exports = { checkCoverage, formatReport };

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseModels(argv) {
  const idx = argv.indexOf("--models");
  let raw;
  if (idx !== -1) {
    if (!argv[idx + 1] || argv[idx + 1].startsWith("--")) {
      throw new BuildError(
        "--models requires a value (e.g. --models gpt-4o,o3)",
      );
    }
    raw = argv[idx + 1];
  } else {
    raw = process.env.SKILL_EVAL_MODELS;
  }
  return (raw || "")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
}

function main(argv) {
  const requiredModels = parseModels(argv);
  const outcome = checkCoverage({ requiredModels });
  process.stdout.write(`${formatReport(outcome, { requiredModels })}\n`);
  if (!outcome.ok) process.exitCode = 1;
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof BuildError) {
      process.stderr.write(`\nskill-coverage failed: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}
