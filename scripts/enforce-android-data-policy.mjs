import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();
const manifestPath = path.join(cwd, 'android', 'app', 'src', 'main', 'AndroidManifest.xml');
const appBuildGradlePath = path.join(cwd, 'android', 'app', 'build.gradle');
const cordovaBuildGradlePath = path.join(cwd, 'android', 'capacitor-cordova-android-plugins', 'build.gradle');
const rootBuildGradlePath = path.join(cwd, 'android', 'build.gradle');
const desiredAllowBackup = 'true';

let changedFiles = 0;

const patchFile = (filePath, transform, label) => {
  if (!fs.existsSync(filePath)) {
    console.log(`[android-data-policy] ${label}: file not found, skipping.`);
    return;
  }

  const original = fs.readFileSync(filePath, 'utf8');
  const updated = transform(original);

  if (updated === original) {
    console.log(`[android-data-policy] ${label}: no changes needed.`);
    return;
  }

  fs.writeFileSync(filePath, updated, 'utf8');
  changedFiles += 1;
  console.log(`[android-data-policy] ${label}: updated.`);
};

const enforceAllowBackup = (content) => {
  const desiredAttribute = `android:allowBackup="${desiredAllowBackup}"`;
  if (content.includes('android:allowBackup="true"') || content.includes('android:allowBackup="false"')) {
    return content.replace(/android:allowBackup="(true|false)"/, desiredAttribute);
  }
  if (content.includes('<application')) {
    return content.replace('<application', `<application\n        ${desiredAttribute}`);
  }
  return content;
};

const enforceAppFlatDirGuard = (content) => {
  if (content.includes('def hasLocalAars =')) return content;

  const target = /repositories\s*\{\s*flatDir\{\s*dirs '\.\.\/capacitor-cordova-android-plugins\/src\/main\/libs', 'libs'\s*\}\s*\}/m;
  if (!target.test(content)) return content;

  const replacement = `def hasLocalAars = !fileTree(dir: '../capacitor-cordova-android-plugins/src/main/libs', include: ['*.aar']).isEmpty() || !fileTree(dir: 'libs', include: ['*.aar']).isEmpty()

repositories {
    if (hasLocalAars) {
        flatDir {
            dirs '../capacitor-cordova-android-plugins/src/main/libs', 'libs'
        }
    }
}`;

  return content.replace(target, replacement);
};

const enforceCordovaFlatDirGuard = (content) => {
  if (content.includes('def hasCordovaLocalAars =')) return content;

  const target = /repositories\s*\{\s*google\(\)\s*mavenCentral\(\)\s*flatDir\{\s*dirs 'src\/main\/libs', 'libs'\s*\}\s*\}/m;
  if (!target.test(content)) return content;

  const replacement = `def hasCordovaLocalAars = !fileTree(dir: 'src/main/libs', include: ['*.aar']).isEmpty() || !fileTree(dir: 'libs', include: ['*.aar']).isEmpty()

repositories {
    google()
    mavenCentral()
    if (hasCordovaLocalAars) {
        flatDir {
            dirs 'src/main/libs', 'libs'
        }
    }
}`;

  return content.replace(target, replacement);
};

const removeUncheckedLintSuppress = (content) => {
  return content
    .replace(/\n*subprojects\s*\{\s*tasks\.withType\(org\.gradle\.api\.tasks\.compile\.JavaCompile\)\.configureEach\s*\{\s*options\.compilerArgs \+= \['-Xlint:-unchecked'\]\s*\}\s*\}\s*\n*/m, '\n\n')
    .replace(/\n{3,}/g, '\n\n');
};

patchFile(manifestPath, enforceAllowBackup, 'manifest allowBackup');
patchFile(appBuildGradlePath, enforceAppFlatDirGuard, 'app build.gradle flatDir guard');
patchFile(cordovaBuildGradlePath, enforceCordovaFlatDirGuard, 'cordova build.gradle flatDir guard');
patchFile(rootBuildGradlePath, removeUncheckedLintSuppress, 'root build.gradle cleanup');

if (changedFiles === 0) {
  console.log('[android-data-policy] all checks already satisfied.');
} else {
  console.log(`[android-data-policy] completed with ${changedFiles} updated file(s).`);
}
