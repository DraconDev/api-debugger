# Firefox AMO Validation Guide

## Overview

Firefox Add-on validation is notoriously strict. This guide documents the issues encountered and how to fix them.

## Critical Firefox Manifest Requirements

### 1. `browser_specific_settings.gecko.id`

Required for any extension that uses `chrome.storage.sync`. Without this, Firefox shows warnings about temporary loading.

```json
"browser_specific_settings": {
  "gecko": {
    "id": "your-extension@yourdomain.com"
  }
}
```

### 2. `browser_specific_settings.gecko.data_collection_permissions`

**Required for ALL new Firefox extensions** (Manifest V2 and V3).

If your extension collects NO data:

```json
"browser_specific_settings": {
  "gecko": {
    "id": "your-extension@yourdomain.com",
    "data_collection_permissions": {
      "required": ["none"]
    }
  }
}
```

If your extension DOES collect data, use `optional` for user-consented data:

```json
"data_collection_permissions": {
  "required": [],
  "optional": ["technicalAndInteraction", "someOtherType"]
}
```

Valid values for `required` and `optional` arrays:

- `"none"` - No data collection
- `"technicalAndInteraction"` - Technical and interaction data
- `"locationInfo"` - Location data (can be required)
- `"usageData"` - Usage statistics
- `"suggestionsContent"` - Content suggestions

## ZIP Packaging

Firefox requires the extension files at the **root** of the ZIP, NOT in a subdirectory.

**WRONG** (will fail with "manifest.json was not found"):

```
firefox-mv2.zip
└── firefox-mv2/
    └── manifest.json  ❌
```

**CORRECT**:

```
draconapi-debugger-1.0.0-firefox.zip
└── manifest.json  ✅
└── background.js
└── icon/
```

## Common Validation Errors

### "manifest.json was not found at the root"

The ZIP has a directory wrapper. Use `wxt zip -b firefox` and verify the output, or repackage manually:

```bash
cd .output
zip -r my-extension.zip firefox-mv2/ -x "*.zip"
# OR better - zip the contents directly:
zip my-extension.zip manifest.json background.js icon/ ...
```

### "data_collection_permissions is missing"

Add the `data_collection_permissions` object to `browser_specific_settings.gecko` as shown above.

### "data_collection_permissions must be object"

The value must be an object `{}`, not `false` or other values.

### "required must be array"

The `required` property must be an array, even if empty or containing `"none"`.

### "required[0] must be one of allowed values"

If you use an array with items, they must be valid permission strings. For no data collection, use `["none"]`.

## Post-Build Fix Script

For WXT-based extensions, use this post-zip script to fix the manifest:

```javascript
// scripts/fix-firefox-manifest.js
import AdmZip from "adm-zip";
import { readdirSync } from "fs";
import { join } from "path";

const outputDir = ".output";
const firefoxZip = readdirSync(outputDir)
  .filter((f) => f.endsWith("-firefox.zip") && !f.includes("sources"))
  .map((f) => join(outputDir, f))
  .sort()
  .pop();

if (!firefoxZip) {
  console.log("No Firefox zip found, skipping");
  process.exit(0);
}

const zip = new AdmZip(firefoxZip);
const manifestEntry = zip.getEntry("manifest.json");

if (!manifestEntry) {
  console.error("manifest.json not found!");
  process.exit(1);
}

const manifest = JSON.parse(manifestEntry.getData().toString("utf-8"));

// Ensure browser_specific_settings.gecko exists
if (!manifest.browser_specific_settings) {
  manifest.browser_specific_settings = {};
}
if (!manifest.browser_specific_settings.gecko) {
  manifest.browser_specific_settings.gecko = {};
}

// Set the data collection permissions
manifest.browser_specific_settings.gecko.data_collection_permissions = {
  required: ["none"],
};

zip.updateFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
zip.writeZip(firefoxZip);

console.log(
  "Fixed Firefox manifest: data_collection_permissions = { required: ['none'] }",
);
```

Add to `package.json`:

```json
{
  "scripts": {
    "zip:firefox": "wxt zip -b firefox && node scripts/fix-firefox-manifest.js"
  }
}
```

## Warnings (Not Errors)

These warnings won't cause validation failure but should be addressed:

### "Unsafe assignment to innerHTML"

Sanitize dynamic content before setting `innerHTML`. Use `textContent` when possible, or DOMPurify.

### "The Function constructor is eval"

Avoid `new Function()` or `eval()`. Use direct function references or `Function.bind()`.

### "storage.sync can cause issues when loaded temporarily"

This is expected if using `chrome.storage.sync`. The warning is informational only.

### "action.onClicked is not supported"

Firefox doesn't support `action.onClicked` in MV2 context. This is a Chrome API that may not be implemented in Firefox. Consider using `browserAction` instead for MV2.

## Testing Locally

Before uploading to AMO:

1. Install via `about:debugging` > This Firefox > Load Temporary Add-on
2. Check the browser console for errors
3. Test on a fresh Firefox profile

## Release Checklist

- [ ] Run `npm run zip:firefox`
- [ ] Verify ZIP has `manifest.json` at root
- [ ] Verify manifest has `browser_specific_settings.gecko.id`
- [ ] Verify manifest has `browser_specific_settings.gecko.data_collection_permissions`
- [ ] Upload `draconapi-debugger-X.X.X-firefox.zip` (NOT `firefox-mv2.zip`)
- [ ] Wait for validation (can take a few minutes)
- [ ] If errors, check the validation output for specifics

## References

- [Firefox built-in consent for data collection](https://mzl.la/firefox-builtin-data-consent)
- [MDN manifest.json documentation](https://mzl.la/2r2McKv)
- [AMO Developer Hub](https://addons.mozilla.org/developers/)
