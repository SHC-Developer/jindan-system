/**
 * 아이콘 생성: public/logo.png → tray-icon.png, app-icon.png, app-icon.ico
 * - tray-icon: 48x48 트레이용
 * - app-icon.png: 256x256 (BrowserWindow용)
 * - app-icon.ico: 16,24,32,48,256 다중 크기 (Windows exe/바로가기용)
 */
import sharp from 'sharp';
import toIco from 'to-ico';
import path from 'path';
import { fileURLToPath } from 'url';
import { writeFile } from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcPath = path.join(root, 'public', 'logo.png');

async function main() {
  // 트레이 아이콘 (48x48)
  const traySize = 48;
  const trayPadding = 2;
  const trayInner = traySize - trayPadding * 2;
  await sharp(srcPath)
    .resize(trayInner, trayInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: trayPadding,
      bottom: trayPadding,
      left: trayPadding,
      right: trayPadding,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toFile(path.join(root, 'public', 'tray-icon.png'));
  console.log('Generated: public/tray-icon.png');

  // 앱 아이콘 (256x256 PNG + ICO)
  const appSize = 256;
  const appPadding = 16;
  const appInner = appSize - appPadding * 2;
  const png256 = await sharp(srcPath)
    .resize(appInner, appInner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({
      top: appPadding,
      bottom: appPadding,
      left: appPadding,
      right: appPadding,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    })
    .png()
    .toBuffer();

  await writeFile(path.join(root, 'public', 'app-icon.png'), png256);
  console.log('Generated: public/app-icon.png');

  const ico = await toIco(png256, { resize: true, sizes: [16, 24, 32, 48, 256] });
  await writeFile(path.join(root, 'public', 'app-icon.ico'), ico);
  console.log('Generated: public/app-icon.ico');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
