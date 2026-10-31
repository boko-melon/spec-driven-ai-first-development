#!/usr/bin/env node
"use strict";

const { execFileSync } = require("node:child_process");

function runGit(args, { capture = false } = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: capture ? "pipe" : "inherit",
  });
}

function assertCleanWorkingTree(git) {
  const status = git(["status", "--porcelain"], { capture: true });
  const changes = status
    .split("\n")
    .filter((line) => line.length > 0 && !line.startsWith("??"));
  if (changes.length > 0) {
    throw new Error("Commit or stash local changes before creating a branch.");
  }
}

function assertRefAvailable(git, args, description) {
  if (git(args, { capture: true }).trim()) {
    throw new Error(`The ${description} already exists.`);
  }
}

function verifyCheckout(git, name) {
  const currentBranch = git(["branch", "--show-current"], {
    capture: true,
  }).trim();
  if (currentBranch !== name) {
    throw new Error(
      `Expected to check out \"${name}\", but \"${currentBranch}\" is active.`,
    );
  }

  const upstream = git(
    ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"],
    { capture: true },
  ).trim();
  if (upstream !== `origin/${name}`) {
    throw new Error(
      `Expected upstream \"origin/${name}\", but found \"${upstream}\".`,
    );
  }
}

function createOpenSpecBranch(branchName, git = runGit) {
  if (!branchName?.trim()) {
    throw new Error("Provide a branch name.");
  }
  const name = branchName.trim().replace(/\s+/g, "-");

  assertCleanWorkingTree(git);

  try {
    git(["check-ref-format", "--branch", name], { capture: true });
  } catch {
    throw new Error(`Invalid branch name: "${name}"`);
  }
  git(["fetch", "origin", "main"]);

  assertRefAvailable(
    git,
    ["branch", "--list", name],
    `local branch \"${name}\"`,
  );
  assertRefAvailable(
    git,
    ["ls-remote", "--heads", "origin", `refs/heads/${name}`],
    `remote branch \"${name}\"`,
  );

  git(["switch", "--create", name, "origin/main"]);

  // Once switch succeeds a local branch exists, so failures beyond this point need cleanup guidance.
  let pushed = false;
  try {
    git(["push", "--set-upstream", "origin", name]);
    pushed = true;
    verifyCheckout(git, name);
  } catch (error) {
    const remoteCleanup = pushed
      ? ` and \"git push origin --delete ${name}\"`
      : "";
    throw new Error(
      `${error.message}\nThe local branch \"${name}\" was already created; run \"git switch -\" ` +
        `and \"git branch -D ${name}\"${remoteCleanup} to undo it if you want to start over.`,
    );
  }
}

if (require.main === module) {
  try {
    createOpenSpecBranch(process.argv[2]);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { createOpenSpecBranch };
