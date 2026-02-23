import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const readHelper = (name: string): string => {
  const filePath = path.resolve(name);
  return fs.readFileSync(filePath, 'utf8');
};

describe('windows helper scripts', () => {
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
});

