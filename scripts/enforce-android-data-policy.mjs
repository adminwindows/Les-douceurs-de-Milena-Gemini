import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const manifestPath = path.join(cwd, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const desiredAllowBackup = 'true';

if (!fs.existsSync(manifestPath)) {
  console.log('[android-data-policy] Android manifest not found, skipping.');
  process.exit(0);
}

const original = fs.readFileSync(manifestPath, 'utf8');
const desiredAttribute = `android:allowBackup="${desiredAllowBackup}"`;

if (original.includes(desiredAttribute)) {
  console.log(`[android-data-policy] allowBackup is already ${desiredAllowBackup}.`);
  process.exit(0);
}

let updated = original;
if (updated.includes('android:allowBackup="true"') || updated.includes('android:allowBackup="false"')) {
  updated = updated.replace(/android:allowBackup="(true|false)"/, desiredAttribute);
} else if (updated.includes('<application')) {
  updated = updated.replace('<application', `<application\n        ${desiredAttribute}`);
} else {
  console.warn('[android-data-policy] <application> tag not found, no changes applied.');
  process.exit(0);
}

if (updated === original) {
  console.log('[android-data-policy] No changes needed.');
  process.exit(0);
}

fs.writeFileSync(manifestPath, updated, 'utf8');
console.log(`[android-data-policy] Enforced ${desiredAttribute}.`);
