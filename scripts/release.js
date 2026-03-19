#!/usr/bin/env node
/**
 * Release Script - Reusable across extensions
 *
 * Usage:
 *   node scripts/release.js              # Interactive
 *   node scripts/release.js --patch      # Auto patch version
 *   node scripts/release.js --minor      # Auto minor version
 *   node scripts/release.js --major      # Auto major version
 *   node scripts/release.js --skip-git   # Skip git operations
 *   node scripts/release.js --skip-build # Skip build (just package)
 */

import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const skipGit = args.includes("--skip-git");
const skipBuild = args.includes("--skip-build");
const bumpType =
  args
    .find((a) => ["--patch", "--minor", "--major"].includes(a))
    ?.replace("--", "") || null;

function log(msg) {
  console.log(`[release] ${msg}`);
}

function run(cmd, options = {}) {
  log(`Running: ${cmd}`);
  try {
    return execSync(cmd, {
      cwd: ROOT,
      stdio: "inherit",
      ...options,
    });
  } catch (e) {
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

function getPackageJson() {
  const path = join(ROOT, "package.json");
  return JSON.parse(readFileSync(path, "utf-8"));
}

function setPackageVersion(version) {
  const pkg = getPackageJson();
  pkg.version = version;

  // Update wxt.config.ts if exists
  const wxtPath = join(ROOT, "wxt.config.ts");
  if (existsSync(wxtPath)) {
    let wxt = readFileSync(wxtPath, "utf-8");
    wxt = wxt.replace(/version: "[^"]*"/, `version: "${version}"`);
    writeFileSync(wxtPath, wxt);
    log("Updated wxt.config.ts");
  }

  writeFileSync(
    join(ROOT, "package.json"),
    JSON.stringify(pkg, null, 2) + "\n",
  );
  log(`Version set to ${version}`);
}

function bumpVersion(type) {
  const pkg = getPackageJson();
  const [major, minor, patch] = pkg.version.split(".").map(Number);

  let newVersion;
  if (type === "major") {
    newVersion = `${major + 1}.0.0`;
  } else if (type === "minor") {
    newVersion = `${major}.${minor + 1}.0`;
  } else {
    newVersion = `${major}.${minor}.${patch + 1}`;
  }

  setPackageVersion(newVersion);
  return newVersion;
}

function updateChangelog(version) {
  const changelogPath = join(ROOT, "CHANGELOG.md");
  if (!existsSync(changelogPath)) {
    log("No CHANGELOG.md found, skipping");
    return;
  }

  let changelog = readFileSync(changelogPath, "utf-8");
  const date = new Date().toISOString().split("T")[0];
  const entry = `## [${version}] - ${date}\n\n### Added\n- Initial release\n`;

  // Insert after title line
  const lines = changelog.split("\n");
  const insertIdx = lines.findIndex((l) => l.startsWith("## ["));
  if (insertIdx > -1) {
    lines.splice(insertIdx, 0, entry);
    changelog = lines.join("\n");
    writeFileSync(changelogPath, changelog);
    log("Updated CHANGELOG.md");
  }
}

function gitTag(version) {
  if (skipGit) {
    log("Skipping git tag (--skip-git)");
    return;
  }

  try {
    run(`git tag -a v${version} -m "Release v${version}"`);
    run(`git push origin v${version}`);
    log(`Created and pushed tag v${version}`);
  } catch (e) {
    log("Git tag failed (may already exist or no git remote)");
  }
}

function build() {
  if (skipBuild) {
    log("Skipping build (--skip-build)");
    return;
  }

  log("Building for Chrome...");
  run("npm run build");

  log("Building for Firefox...");
  run("npm run build:firefox");

  log("Creating ZIPs...");
  run("npm run zip");
  run("npm run zip:firefox");
}

function createGithubRelease(version) {
  if (skipGit) return;

  log("Creating GitHub release...");

  const zipFiles = [
    `.output/${getPackageJson().name.replace("@dracon/", "")}-${version}-chrome.zip`,
    `.output/${getPackageJson().name.replace("@dracon/", "")}-${version}-firefox.zip`,
    `.output/${getPackageJson().name.replace("@dracon/", "")}-${version}-sources.zip`,
  ].filter((f) => existsSync(join(ROOT, f)));

  // Use GitHub CLI if available
  try {
    const body = `## Installation\n\n### Chrome\n1. Download the \`-chrome.zip\` file\n2. Unzip and load as unpacked extension in \`chrome://extensions\`\n\n### Firefox\n1. Download the \`-firefox.zip\` file\n2. Go to \`about:addons\` > Settings (gear icon) > Install Add-on From File\n\n## Changes\n\nSee CHANGELOG.md for details.`;

    const files = zipFiles.map((f) => `-F "file=@${f}"`).join(" ");
    run(
      `gh release create v${version} ${files} --title "v${version}" --notes "${body}"`,
      { stdio: "ignore" },
    );
    log("Created GitHub release");
  } catch (e) {
    log("GitHub release creation skipped (gh CLI not configured or no remote)");
  }
}

// Main
async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║           Extension Release              ║");
  console.log("╚════════════════════════════════════════╝\n");

  let version;

  if (bumpType) {
    version = bumpVersion(bumpType);
    updateChangelog(version);
  } else {
    version = getPackageJson().version;
    console.log(`Current version: ${version}`);
    console.log(`Usage: --patch | --minor | --major\n`);
  }

  build();
  gitTag(version);
  createGithubRelease(version);

  console.log("\n╔════════════════════════════════════════╗");
  console.log("║              Complete!                 ║");
  console.log("╚════════════════════════════════════════╝\n");

  console.log("Next steps:");
  console.log("1. Review the built files in .output/");
  console.log("2. Test the extension locally");
  console.log("3. Upload to stores:");
  console.log("   - Chrome: https://chrome.google.com/webstore/dev");
  console.log("   - Firefox: https://addons.mozilla.org/developers/");
  console.log(
    "   - Edge: https://partner.microsoft.com/dashboard/microsoftedge/",
  );
  console.log("4. Create GitHub release if not done automatically");
}

main();
