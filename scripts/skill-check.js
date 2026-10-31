"use strict";

/**
 * skill-check — the interim, advisory replacement for the PreToolUse runtime gate.
 *
 * The gate proper was meant to fire as a hook and reject a skill that was stale
 * or unevaluated on the live model. Hooks here don't receive the model string and
 * the surface is preview-only, so instead the agent runs THIS script when it uses
 * a skill, passing its own (self-reported) model, and reads the verdict. It is a
 * pure read — resolve + a few file reads, no eval execution.
 *
 * It answers two questions against the working tree:
 *   1. Freshness — does the source resolve to the same context_hash the build
 *      recorded in .github/skills/manifest.json? Mismatch (or no build) → STALE.
 *   2. Approval — a committed `with_skill` stamp is an approval. Is there one whose
 *      context_hash matches the current hash AND whose model matches the running
 *      model? If so → APPROVED.
 *
 * Verdict is APPROVED only when fresh AND a matching stamp exists; otherwise the
 * agent is expected to warn the user. Stamp pass-rates are surfaced for the agent
 * to judge, but existence — not a threshold — is the approval, because a stamp is
 * only committed once a run has been approved.
 */

const fs = require("fs");
const path = require("path");

const { BuildError, SRC_DIR, resolveSkill } = require("./skill-resolver");

const REPO_ROOT = path.join(__dirname, "..");
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  ".github",
  "skills",
  "manifest.json",
);

/** Strip the `asserted:` prefix run-evals writes and lower-case, so a
 * self-reported `claude-opus-4-8` matches a stamped `asserted:claude-opus-4-8`. */
function normalizeModel(model) {
  return String(model || "")
    .trim()
    .toLowerCase()
    .replace(/^asserted:/, "");
}

function readManifest(manifestPath) {
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    throw new BuildError(
      `Could not parse manifest at ${manifestPath}: ${err.message}`,
    );
  }
}

/** Read `with_skill` stamps from an append-only stamps.jsonl. Absent file → []. */
function readWithSkillStamps(stampsPath) {
  if (!fs.existsSync(stampsPath)) return [];
  return fs
    .readFileSync(stampsPath, "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function summarizeStamp(stamp) {
  return {
    model: stamp.model,
    effort: stamp.effort ?? null,
    pass_rate: stamp.overall?.pass_rate?.mean ?? null,
    timestamp: stamp.timestamp ?? null,
  };
}

/**
 * Compute the freshness + approval verdict for one skill. All paths are injectable
 * so the pure logic is testable against fixtures. Returns a structured result;
 * `status` is one of NO_BUILD | STALE | APPROVED | UNAPPROVED, and `warn` is true
 * for everything but APPROVED.
 */
function checkSkill({
  skillName,
  model,
  srcDir = SRC_DIR,
  manifestPath = MANIFEST_PATH,
  stampsPath,
} = {}) {
  if (!skillName) throw new BuildError("checkSkill requires a skillName.");

  const skillSrcDir = path.join(srcDir, skillName);
  const skillMdPath = path.join(skillSrcDir, "SKILL.md");
  if (!fs.existsSync(skillMdPath)) {
    throw new BuildError(
      `No skill source at ${skillMdPath}. Known skills live under ${srcDir}.`,
    );
  }
  const resolvedStampsPath =
    stampsPath || path.join(skillSrcDir, "evals", "stamps.jsonl");

  const { context_hash: currentHash } = resolveSkill({
    srcText: fs.readFileSync(skillMdPath, "utf8"),
    skillName,
    skillDir: skillSrcDir,
  });

  const manifest = readManifest(manifestPath);
  const builtEntry = manifest ? manifest[skillName] : undefined;
  const built = {
    present: Boolean(builtEntry),
    contextHash: builtEntry ? builtEntry.context_hash : null,
    fresh: Boolean(builtEntry) && builtEntry.context_hash === currentHash,
  };

  const stamps = readWithSkillStamps(resolvedStampsPath);
  const sameHash = stamps.filter((s) => s.context_hash === currentHash);
  const normalizedModel = normalizeModel(model);
  const approved = normalizedModel
    ? sameHash.filter((s) => normalizeModel(s.model) === normalizedModel)
    : [];

  let status;
  if (!built.present) status = "NO_BUILD";
  else if (!built.fresh) status = "STALE";
  else if (approved.length > 0) status = "APPROVED";
  else status = "UNAPPROVED";

  return {
    skill: skillName,
    model: model || null,
    currentContextHash: currentHash,
    built,
    stamps: {
      sameHash: sameHash.map(summarizeStamp),
      approvedForModel: approved.map(summarizeStamp),
    },
    status,
    warn: status !== "APPROVED",
  };
}

function shortHash(hash) {
  return hash ? hash.replace(/^sha256:/, "").slice(0, 12) : "none";
}

/** Human/agent-readable report. First line is `STATUS: <verdict>` so the agent
 * can branch on it without parsing the prose that follows. */
function formatReport(result) {
  const lines = [`STATUS: ${result.status}`, ""];
  lines.push(`skill:   ${result.skill}`);
  lines.push(`model:   ${result.model || "(not provided)"}`);
  lines.push(
    `context: sha256:${shortHash(result.currentContextHash)} (working tree)`,
  );

  if (!result.built.present) {
    lines.push("build:   NOT BUILT — no manifest entry.");
    lines.push("");
    lines.push(
      "→ Run `npm run build:skills`, then restart before trusting this skill.",
    );
    return lines.join("\n");
  }

  lines.push(
    `build:   ${
      result.built.fresh
        ? "FRESH — matches the built context hash."
        : `STALE — build is sha256:${shortHash(result.built.contextHash)}, sources have changed.`
    }`,
  );

  const same = result.stamps.sameHash;
  const approved = result.stamps.approvedForModel;
  if (same.length === 0) {
    lines.push("stamps:  none for the current context hash.");
  } else {
    lines.push(`stamps:  ${same.length} for the current context hash —`);
    const approvedSet = new Set(
      approved.map((s) => `${s.model}|${s.timestamp}`),
    );
    for (const s of same) {
      const mark = approvedSet.has(`${s.model}|${s.timestamp}`)
        ? "✓ this model"
        : "  other model";
      const rate = s.pass_rate == null ? "n/a" : s.pass_rate.toFixed(2);
      lines.push(
        `           ${mark}: ${s.model} (pass ${rate}, ${s.timestamp})`,
      );
    }
  }

  lines.push("");
  if (result.status === "APPROVED") {
    lines.push("→ Approved for this context and model. Proceed.");
  } else if (result.status === "STALE") {
    lines.push(
      "→ Run `npm run build:skills`, then restart before trusting this skill.",
    );
  } else {
    lines.push(
      result.model
        ? "→ No approved run for this model + context. Warn the user before relying on the skill."
        : "→ No model provided, so approval can't be confirmed. Re-run with --model <your-model-id>.",
    );
  }
  return lines.join("\n");
}

module.exports = {
  normalizeModel,
  readManifest,
  readWithSkillStamps,
  checkSkill,
  formatReport,
  MANIFEST_PATH,
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = [...argv];
  let model;
  const modelIdx = args.indexOf("--model");
  if (modelIdx !== -1) {
    model = args[modelIdx + 1];
    args.splice(modelIdx, 2);
  }
  const skillName = args[0];
  return { skillName, model };
}

function main(argv) {
  const { skillName, model } = parseArgs(argv);
  if (!skillName) {
    throw new BuildError("Usage: skill-check.js <skill> --model <model-id>");
  }
  const result = checkSkill({ skillName, model });
  process.stdout.write(`${formatReport(result)}\n`);
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof BuildError) {
      process.stderr.write(`\nskill-check failed: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}
