import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const cwd = process.cwd();
const androidResPath = path.join(cwd, 'android', 'app', 'src', 'main', 'res');

const logoCandidates = [
  'public/logo-user.png',
  'public/logo-user.jpg',
  'public/logo-user.jpeg',
  'public/logo-user.webp',
  'public/logo-user.avif',
  'public/logo-milena.svg',
  'public/favicon.svg'
].map(p => path.join(cwd, p));

const sourceLogo = logoCandidates.find(p => fs.existsSync(p));

if (!sourceLogo) {
  console.log('⚠️ No logo file found in public/. Skipping Android icon generation.');
  process.exit(0);
}

if (!fs.existsSync(androidResPath)) {
  console.log('⚠️ android resources folder not found. Run `npm run mobile:add:android` first.');
  process.exit(0);
}

const targets = [
  { dir: 'mipmap-mdpi', size: 48 },
  { dir: 'mipmap-hdpi', size: 72 },
  { dir: 'mipmap-xhdpi', size: 96 },
  { dir: 'mipmap-xxhdpi', size: 144 },
  { dir: 'mipmap-xxxhdpi', size: 192 }
];

const iconNames = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png'];

const generate = async () => {
  for (const { dir, size } of targets) {
    const outDir = path.join(androidResPath, dir);
    fs.mkdirSync(outDir, { recursive: true });

    const logoBuffer = await sharp(sourceLogo)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();

    for (const iconName of iconNames) {
      fs.writeFileSync(path.join(outDir, iconName), logoBuffer);
    }
  }

  console.log(`✅ Android launcher icons generated from ${path.relative(cwd, sourceLogo)}`);
};

generate().catch((err) => {
  console.error('❌ Failed to generate Android icons from logo.', err);
  process.exit(1);
});
