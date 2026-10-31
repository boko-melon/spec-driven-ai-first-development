"use strict";

/**
 * skill-resolver — the single implementation of resolve, normalize, and
 * content-addressed hashing shared by the build and the eval workflow.
 *
 * Both `scripts/build-skills.js` and the `run-evals` skill import this module;
 * neither redefines `normalize`, link resolution, or `context_hash`. Keeping one
 * implementation (guarded by `scripts/__tests__/skill-resolver.test.js`) is the
 * whole point: the build and the eval workflow must resolve to the same bytes
 * and the same hash, so they cannot drift apart.
 *
 * Skills reference docs by markdown link, authored relative to the source file.
 * A skill's `context_hash` covers its body, its bundled files, and every file
 * outside the skill that it links to, so editing a linked doc marks the skill
 * stale. Resolution fails closed: a link that leaves the skill and does not
 * resolve to a file under `docs/docs/` aborts with a `BuildError` naming the
 * skill and the target.
 */

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const REPO_ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(REPO_ROOT, "skills-src");
// Links that leave the skill folder must resolve under here; the coverage workflow's `paths` filter relies on this.
const LINKABLE_DIR = "docs/docs/";

// Fenced blocks and inline code spans, whose link-like text is not a link.
const MARKDOWN_CODE =
  /^ {0,3}(`{3,}|~{3,})[^\n]*\n[\s\S]*?^ {0,3}\1[^\n]*$|`[^`\n]*`/gm;
// Inline links and images (`](target`) and reference definitions (`[id]: target`).
const MARKDOWN_LINK =
  /(\]\(\s*<?)([^\s)>]+)|(^ {0,3}\[[^\]\n]+\]:\s*<?)([^\s>]+)/gm;
const URL_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

class BuildError extends Error {}

function toRepoRelative(absPath) {
  return path.relative(REPO_ROOT, absPath).split(path.sep).join("/");
}

function sha256Hex(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input, "utf8");
  return crypto.createHash("sha256").update(buf).digest("hex");
}

/**
 * The one normalization function, used both for the bytes of a generated
 * skill and for the bytes fed to every hash. In order: decode UTF-8,
 * Unicode NFC, LF endings, strip per-line trailing whitespace, collapse runs of
 * blank lines to a single blank line, and end with exactly one trailing newline.
 * A cosmetic edit that does not change this output cannot change any hash.
 */
function normalize(input) {
  let s = Buffer.isBuffer(input) ? input.toString("utf8") : String(input);
  s = s.normalize("NFC");
  s = s.replace(/\r\n?/g, "\n");
  s = s.replace(/[ \t]+$/gm, "");
  s = s.replace(/\n{3,}/g, "\n\n");
  s = s.replace(/\n+$/, "");
  return s.length ? `${s}\n` : "";
}

// Frontmatter fence tolerates CRLF: sources are authored on Windows.
function splitFrontmatter(text) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(text);
  if (!match) {
    return { frontmatter: null, body: text };
  }
  return { frontmatter: match[1], body: text.slice(match[0].length) };
}

// A file counts as a hashable sibling if it belongs to the skill's runtime tree
// but is not SKILL.md itself: everything except SKILL.md, the eval assets under
// `evals/` (covered by cases_hash), and any `*-workspace/` eval sandbox. Mirrors
// build-skills' `isRuntimeSkillFile` so the bytes hashed are exactly the bytes
// shipped alongside the generated SKILL.md.
function runtimeSiblings(skillDir) {
  if (!skillDir || !fs.existsSync(skillDir)) return [];
  return listFiles(skillDir)
    .filter((rel) => {
      if (rel === "SKILL.md") return false;
      const firstSegment = rel.split("/")[0];
      return firstSegment !== "evals" && !firstSegment.endsWith("-workspace");
    })
    .sort((a, b) => a.localeCompare(b));
}

// Text through `normalize()`, binary as raw bytes.
function fileHash(buf) {
  return buf.includes(0)
    ? sha256Hex(buf)
    : sha256Hex(normalize(buf.toString("utf8")));
}

function siblingHashes(skillDir) {
  return runtimeSiblings(skillDir).map((rel) => ({
    rel,
    hash: fileHash(fs.readFileSync(path.join(skillDir, rel))),
  }));
}

// Calls `fn` with each local link target in `markdown` outside code (URLs and
// same-page anchors are skipped) and splices in the target it returns.
function mapLinkTargets(markdown, fn) {
  const mapProse = (text) =>
    text.replace(
      MARKDOWN_LINK,
      (match, inlinePrefix, inlineTarget, refPrefix, refTarget) => {
        const target = inlineTarget ?? refTarget;
        if (URL_SCHEME.test(target) || target.startsWith("#")) return match;
        return (inlinePrefix ?? refPrefix) + fn(target);
      },
    );

  let out = "";
  let last = 0;
  for (const code of markdown.matchAll(MARKDOWN_CODE)) {
    out += mapProse(markdown.slice(last, code.index)) + code[0];
    last = code.index + code[0].length;
  }
  return out + mapProse(markdown.slice(last));
}

// `doc.md#section` → ["doc.md", "#section"].
function splitLinkTarget(target) {
  const i = target.search(/[#?]/);
  return i === -1 ? [target, ""] : [target.slice(0, i), target.slice(i)];
}

// Resolves a target from the source file `<skillDir>/<fromRel>` and returns the
// absolute path only when the link leaves the skill directory.
function outboundPath(target, fromRel, skillDir) {
  const [file] = splitLinkTarget(target);
  if (!file) return null;
  const abs = path.resolve(path.dirname(path.join(skillDir, fromRel)), file);
  const inside = path.relative(skillDir, abs);
  return inside === ".." ||
    inside.startsWith(".." + path.sep) ||
    path.isAbsolute(inside)
    ? abs
    : null;
}

// The skill's markdown files an agent reads: SKILL.md plus bundled `.md` siblings.
function skillMarkdown(srcText, skillDir) {
  return [
    { rel: "SKILL.md", text: srcText },
    ...runtimeSiblings(skillDir)
      .filter((rel) => rel.endsWith(".md"))
      .map((rel) => ({
        rel,
        text: fs.readFileSync(path.join(skillDir, rel), "utf8"),
      })),
  ];
}

/**
 * Every file outside the skill that SKILL.md or a bundled markdown file links to,
 * as sorted `{ path, hash }` with `path` relative to the repo root. Links are
 * authored relative to the source file under `skills-src/<name>/`. Links inside
 * the skill are skipped — `siblingHashes` covers them. Fails closed on a link to
 * anything that is not a file under `docs/docs/`.
 */
function linkedFileHashes({ srcText, skillName, skillDir }) {
  const baseDir = skillDir ?? path.join(SRC_DIR, skillName);
  // `<root>/skills-src/<name>/` → `<root>`.
  const linkRoot = path.resolve(baseDir, "..", "..");
  const byPath = new Map();

  for (const { rel, text } of skillMarkdown(srcText, skillDir)) {
    mapLinkTargets(text, (target) => {
      const abs = outboundPath(target, rel, baseDir);
      if (!abs) return target;
      const repoRel = path.relative(linkRoot, abs).split(path.sep).join("/");
      if (!repoRel.startsWith(LINKABLE_DIR)) {
        throw new BuildError(
          `Skill "${skillName}" links to "${target}" in ${rel}, which resolves to ` +
            `${repoRel} — links outside the skill folder must point to files under ${LINKABLE_DIR}.`,
        );
      }
      if (byPath.has(repoRel)) return target;
      let bytes;
      try {
        bytes = fs.readFileSync(abs);
      } catch (err) {
        if (!["ENOENT", "EISDIR", "ENOTDIR"].includes(err.code)) throw err;
        throw new BuildError(
          `Skill "${skillName}" links to "${target}" in ${rel}, which resolves to ` +
            `${repoRel} — not a file. Links are relative to the source file.`,
        );
      }
      byPath.set(repoRel, fileHash(bytes));
      return target;
    });
  }

  return [...byPath]
    .map(([p, hash]) => ({ path: p, hash }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

// Rewrites each link in `<skillDir>/<rel>` that leaves the skill to
// `linkTo(absolutePath, rel)`, keeping any `#fragment`. A copy of the skill
// placed anywhere but `skills-src/<name>/` needs this for its links to resolve.
function relinkOutbound(text, rel, skillDir, linkTo) {
  return mapLinkTargets(text, (target) => {
    const abs = outboundPath(target, rel, skillDir);
    return abs ? linkTo(abs, rel) + splitLinkTarget(target)[1] : target;
  });
}

// `linkTo` for a copy at `outSkillDir`: relative to the copied file.
function relativeLinks(outSkillDir) {
  return (abs, rel) =>
    path
      .relative(path.dirname(path.join(outSkillDir, rel)), abs)
      .split(path.sep)
      .join("/");
}

// `linkTo` for a copy outside the repo, such as the eval workspace in a temp dir.
function absoluteLinks(abs) {
  return abs.split(path.sep).join("/");
}

/**
 * `context_hash(skill) = sha256(skill_body_hash ++ sorted [(sibling_path,
 * sibling_hash)] ++ sorted [("link:" + linked_path, linked_hash)])`, where
 * `skill_body_hash = sha256(normalize(body with frontmatter removed))`, each
 * sibling is a non-SKILL.md, non-eval file, and each linked file is one outside
 * the skill that the skill links to (repo-relative path); siblings and linked
 * files are hashed through `normalize()` (text) or raw bytes (binary). Excludes
 * skill frontmatter. The sibling and link segments are appended only when
 * non-empty, so adding either kind never changes the hash of a skill that has
 * none. Computed, never stored; byte-stable across machines for identical sources.
 */
function contextHash({ skillSource, siblings = [], links = [] }) {
  const { body } = splitFrontmatter(skillSource);
  const skillBodyHash = sha256Hex(normalize(body));

  const siblingPairs = [...siblings]
    .sort((a, b) => a.rel.localeCompare(b.rel))
    .map((s) => `${s.rel}\n${s.hash}`);

  const linkPairs = [...links]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((l) => `link:${l.path}\n${l.hash}`);

  return `sha256:${sha256Hex([skillBodyHash, ...siblingPairs, ...linkPairs].join("\n"))}`;
}

/**
 * Resolve one skill source. Returns the generated SKILL.md (`generated`), the
 * sorted repo-relative files it links to outside the skill (`links`), and the
 * content-addressed `context_hash`.
 *
 * Pass `skillDir` to fold the skill's sibling files (REFERENCE.md, WORKFLOWS.md,
 * and any other non-eval bundled file), and the files they link to, into
 * `context_hash`. Omit it — as unit tests do — to hash the SKILL.md body and
 * its links alone. Pass `linkTo` (`relativeLinks`/`absoluteLinks`) to rewrite
 * the outbound links in `generated` for where the copy will live.
 */
function resolveSkill({ srcText, skillName, skillDir, linkTo }) {
  const { frontmatter, body: authoredBody } = splitFrontmatter(srcText);
  if (!frontmatter) {
    throw new BuildError(`Skill "${skillName}" SKILL.md has no frontmatter.`);
  }

  const siblings = skillDir ? siblingHashes(skillDir) : [];
  const links = linkedFileHashes({ srcText, skillName, skillDir });
  const context_hash = contextHash({
    skillSource: srcText,
    siblings,
    links,
  });

  const body = linkTo
    ? relinkOutbound(
        authoredBody,
        "SKILL.md",
        skillDir ?? path.join(SRC_DIR, skillName),
        linkTo,
      )
    : authoredBody;

  return {
    generated: normalize(`---\n${frontmatter}\n---\n${body}`),
    links: links.map((l) => l.path),
    context_hash,
  };
}

function listFiles(dir, base = dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...listFiles(abs, base));
    } else if (entry.isFile()) {
      out.push(path.relative(base, abs).split(path.sep).join("/"));
    }
  }
  return out;
}

/**
 * Resolve every skill under `srcDir` into `outDir/skills/<skill>/SKILL.md`
 * (copying non-`SKILL.md` files through) and write `outDir/manifest.json`
 * mapping each skill to `{ context_hash, links, source_sha }`. Fails closed on
 * any resolution error. Links leaving a skill are rewritten to absolute paths,
 * since `outDir` is a temp dir outside the repo; `context_hash` is unaffected.
 */
function resolveAll({ srcDir = SRC_DIR, outDir }) {
  if (!outDir) throw new BuildError("resolveAll requires an outDir.");
  if (!fs.existsSync(srcDir)) {
    throw new BuildError(
      `Skill source directory not found: ${toRepoRelative(srcDir)}`,
    );
  }

  const skillNames = fs
    .readdirSync(srcDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(srcDir, name, "SKILL.md")))
    .sort((a, b) => a.localeCompare(b));

  const manifest = {};
  for (const skillName of skillNames) {
    const skillSrcDir = path.join(srcDir, skillName);
    const skillOutDir = path.join(outDir, "skills", skillName);
    const skillMdPath = path.join(skillSrcDir, "SKILL.md");

    const { generated, links, context_hash } = resolveSkill({
      srcText: fs.readFileSync(skillMdPath, "utf8"),
      skillName,
      skillDir: skillSrcDir,
      linkTo: absoluteLinks,
    });

    const runtimeMarkdown = new Set(
      runtimeSiblings(skillSrcDir).filter((rel) => rel.endsWith(".md")),
    );
    for (const rel of listFiles(skillSrcDir).sort((a, b) =>
      a.localeCompare(b),
    )) {
      const outFile = path.join(skillOutDir, rel);
      fs.mkdirSync(path.dirname(outFile), { recursive: true });
      if (rel === "SKILL.md") {
        fs.writeFileSync(outFile, generated);
      } else if (runtimeMarkdown.has(rel)) {
        const text = fs.readFileSync(path.join(skillSrcDir, rel), "utf8");
        fs.writeFileSync(
          outFile,
          relinkOutbound(text, rel, skillSrcDir, absoluteLinks),
        );
      } else {
        fs.writeFileSync(outFile, fs.readFileSync(path.join(skillSrcDir, rel)));
      }
    }

    manifest[skillName] = {
      context_hash,
      links,
      source_sha: `sha256:${sha256Hex(fs.readFileSync(skillMdPath))}`,
    };
  }

  const manifestPath = path.join(outDir, "manifest.json");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return { manifest, skills: skillNames };
}

/**
 * `sha256` over a skill's eval assets — `evals/evals.json`,
 * `evals/trigger-evals.json` (if present), and every file under `evals/files/` —
 * in sorted path order. Text is hashed through `normalize()`, binary as raw
 * bytes, so `cases_hash` agrees with every other hash on cosmetic edits.
 */
function casesHash(skillDir) {
  const evalsDir = path.join(skillDir, "evals");
  if (!fs.existsSync(path.join(evalsDir, "evals.json"))) {
    throw new BuildError(
      `No evals.json under ${toRepoRelative(evalsDir)} — cannot compute cases_hash.`,
    );
  }

  const rels = ["evals/evals.json"];
  if (fs.existsSync(path.join(evalsDir, "trigger-evals.json"))) {
    rels.push("evals/trigger-evals.json");
  }
  const filesDir = path.join(evalsDir, "files");
  if (fs.existsSync(filesDir)) {
    for (const rel of listFiles(filesDir)) {
      rels.push(`evals/files/${rel}`);
    }
  }
  rels.sort((a, b) => a.localeCompare(b));

  const hash = crypto.createHash("sha256");
  for (const rel of rels) {
    const buf = fs.readFileSync(path.join(skillDir, rel));
    const isBinary = buf.includes(0);
    const content = isBinary
      ? buf
      : Buffer.from(normalize(buf.toString("utf8")), "utf8");
    hash.update(rel);
    hash.update("\0");
    hash.update(content);
    hash.update("\0");
  }
  return `sha256:${hash.digest("hex")}`;
}

module.exports = {
  BuildError,
  SRC_DIR,
  sha256Hex,
  normalize,
  splitFrontmatter,
  siblingHashes,
  mapLinkTargets,
  linkedFileHashes,
  relinkOutbound,
  relativeLinks,
  absoluteLinks,
  contextHash,
  resolveSkill,
  resolveAll,
  casesHash,
  listFiles,
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

// A fresh, uniquely named temp dir for this invocation — never reused across
// runs, so no leftover workspace is ever read. Created here (not in the shell)
// so `resolve --new-workspace` is a single `node` call that needs no extra
// filesystem preamble to approve.
function makeWorkspaceDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skill-resolver-"));
}

// `resolve` targets either an explicit `--into <dir>` or, with
// `--new-workspace`, a freshly minted temp dir this function creates.
function resolveOutDir(args) {
  if (args.includes("--new-workspace")) {
    return makeWorkspaceDir();
  }
  const idx = args.indexOf("--into");
  if (idx === -1 || !args[idx + 1]) {
    throw new BuildError(
      "resolve requires `--into <dir>` or `--new-workspace`.",
    );
  }
  return path.resolve(args[idx + 1]);
}

function main(argv) {
  const [subcommand, ...rest] = argv;

  if (subcommand === "resolve") {
    const outDir = resolveOutDir(rest);
    const { skills } = resolveAll({ outDir });
    // Machine-readable line first so callers can capture the path directly.
    process.stdout.write(`WORKSPACE=${outDir}\n`);
    process.stdout.write(
      `skill-resolver: resolved ${skills.length} skill(s) into ${outDir}\n`,
    );
    return;
  }

  if (subcommand === "cases-hash") {
    const skillDir = rest[0];
    if (!skillDir) {
      throw new BuildError("cases-hash requires a <skill-dir> argument.");
    }
    process.stdout.write(`${casesHash(path.resolve(skillDir))}\n`);
    return;
  }

  throw new BuildError(
    `Unknown subcommand "${subcommand ?? ""}". Usage: ` +
      "skill-resolver.js resolve (--into <dir> | --new-workspace) | " +
      "cases-hash <skill-dir>",
  );
}

if (require.main === module) {
  try {
    main(process.argv.slice(2));
  } catch (err) {
    if (err instanceof BuildError) {
      process.stderr.write(`\nskill-resolver failed: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}
