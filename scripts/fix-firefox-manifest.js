#!/usr/bin/env node
/**
 * Post-build script to fix Firefox manifest issues
 * Adds data_collection_permissions to Firefox manifest
 */

import { readFileSync, writeFileSync } from "fs";

const manifestPath = ".output/firefox-mv2/manifest.json";

const manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));

// Add data_collection_permissions (required by Firefox for new extensions)
if (!manifest.browser_specific_settings) {
  manifest.browser_specific_settings = {};
}
if (!manifest.browser_specific_settings.gecko) {
  manifest.browser_specific_settings.gecko = {};
}
manifest.browser_specific_settings.gecko.data_collection_permissions = false;

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(
  "Fixed Firefox manifest: added data_collection_permissions = false",
);
