import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readHelper = (name: string): string => {
  const filePath = path.resolve(name);
  return fs.readFileSync(filePath, 'utf8');
};

describe('windows helper scripts', () => {
  it('keeps explicit pause behavior in all root windows cmd helpers', () => {
    const helpers = [
      'windows-first-time-debug.cmd',
      'windows-first-time-release.cmd',
      'windows-next-debug.cmd',
      'windows-next-release.cmd',
      'windows-create-release-key.cmd',
      'windows-sign-release-apk.cmd'
    ];

    for (const helper of helpers) {
      const content = readHelper(helper);
      expect(content).toMatch(/\bpause\b/i);
    }
  });

  it('guard Java versions below 21 in all one-click helpers', () => {
    const helpers = [
      'windows-first-time-debug.cmd',
      'windows-first-time-release.cmd',
      'windows-next-debug.cmd',
      'windows-next-release.cmd'
    ];

    for (const helper of helpers) {
      const content = readHelper(helper);
      expect(content).toContain('if !JAVA_MAJOR! LSS 21 (');
    }
  });

  it('uses consistent release step counters', () => {
    const firstRelease = readHelper('windows-first-time-release.cmd');
    expect(firstRelease).toContain('[1/11]');
    expect(firstRelease).toContain('[11/11]');

    const nextRelease = readHelper('windows-next-release.cmd');
    expect(nextRelease).toContain('[8/8] APK outputs:');
  });

  it('keeps release keystore at project root (outside android folder)', () => {
    const createKey = readHelper('windows-create-release-key.cmd');
    const signApk = readHelper('windows-sign-release-apk.cmd');

    expect(createKey).toContain('set "KEYSTORE_PATH=milena-share.keystore"');
    expect(signApk).toContain('set "KEYSTORE_PATH=milena-share.keystore"');
    expect(createKey).toContain('-keystore "%KEYSTORE_PATH%"');
    expect(signApk).toContain('--ks "%KEYSTORE_PATH%"');
    expect(signApk).toContain('-keystore "%KEYSTORE_PATH%"');
    expect(createKey).not.toContain('-keystore android\\keystores');
    expect(signApk).not.toContain('--ks "android\\keystores');
    expect(signApk).not.toContain('-keystore "android\\keystores');
  });

  it('keeps one-click release flow non-closing while avoiding double pause in nested signing call', () => {
    const firstRelease = readHelper('windows-first-time-release.cmd');
    const nextRelease = readHelper('windows-next-release.cmd');
    const signApk = readHelper('windows-sign-release-apk.cmd');

    expect(firstRelease).toContain('call windows-sign-release-apk.cmd --no-pause || goto :fail');
    expect(nextRelease).toContain('call windows-sign-release-apk.cmd --no-pause || goto :fail');
    expect(signApk).toContain('if /i "%~1"=="--no-pause" set "NO_PAUSE=1"');
  });

  it('allows milena release keystore to be archived in git', () => {
    const gitignore = readHelper('.gitignore');
    const createKey = readHelper('windows-create-release-key.cmd');

    expect(gitignore).toContain('!milena-share.keystore');
    expect(createKey).toContain('git add "%KEYSTORE_PATH%"');
  });
});
