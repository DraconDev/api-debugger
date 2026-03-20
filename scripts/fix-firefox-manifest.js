#!/usr/bin/env node
/**
 * Post-zip script to fix Firefox manifest
 * Patches the Firefox ZIP file directly to add data_collection_permissions
 */

import AdmZip from "adm-zip";
import { existsSync, readdirSync } from "fs";
import { join } from "path";

const outputDir = ".output";
const firefoxZip = readdirSync(outputDir)
  .filter((f) => f.endsWith("-firefox.zip") && !f.includes("sources"))
  .map((f) => join(outputDir, f))
  .sort()
  .pop();

if (!firefoxZip) {
  console.log("No Firefox zip found, skipping fix");
  process.exit(0);
}

console.log(`Fixing manifest in: ${firefoxZip}`);

const zip = new AdmZip(firefoxZip);
const manifestEntry = zip.getEntry("manifest.json");

if (!manifestEntry) {
  console.error("manifest.json not found in zip!");
  process.exit(1);
}

const manifest = JSON.parse(manifestEntry.getData().toString("utf-8"));

if (!manifest.browser_specific_settings) {
  manifest.browser_specific_settings = {};
}
if (!manifest.browser_specific_settings.gecko) {
  manifest.browser_specific_settings.gecko = {};
}
manifest.browser_specific_settings.gecko.data_collection_permissions = {
  required: ["none"],
};

zip.updateFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
zip.writeZip(firefoxZip);

console.log(
  "Fixed Firefox manifest: added data_collection_permissions = false",
);
