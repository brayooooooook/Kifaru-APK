#!/usr/bin/env node
/**
 * Produce an installable ARM-compatible Android APK without a system JDK:
 * nitron WebView dex + aapt2 + android.jar (npm) + apk_sign_ts.
 */
import { execFileSync } from 'node:child_process';
import { createPrivateKey, generateKeyPairSync, X509Certificate } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import JSZip from 'jszip';
import { ApkSigner, SigningKey } from 'apk_sign_ts';
import selfsigned from 'selfsigned';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tools = join(root, 'tools');
const outDir = join(root, 'releases');
const aapt2 = join(tools, 'aapt2');
const androidJar = join(tools, 'android.jar');
const baseApk = join(tools, 'base.apk');
const dist = join(root, 'dist');

mkdirSync(outDir, { recursive: true });
const work = join(tmpdir(), 'lha-apk-' + Date.now());
mkdirSync(work, { recursive: true });
const res = join(work, 'res');
mkdirSync(join(res, 'mipmap-xxxhdpi'), { recursive: true });
mkdirSync(join(res, 'values'), { recursive: true });

const icon = join(root, 'public', 'icon-192.png');
cpSync(icon, join(res, 'mipmap-xxxhdpi', 'ic_launcher.png'));
writeFileSync(
  join(res, 'values', 'strings.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<resources>
  <string name="app_name">Long Haul Africa</string>
</resources>
`,
);

const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.kifaruinteractive.longhaulafrica"
    android:versionCode="1"
    android:versionName="1.0.0">
    <uses-sdk android:minSdkVersion="21" android:targetSdkVersion="34" />
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-feature android:glEsVersion="0x00020000" android:required="true" />
    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="false">
        <activity
            android:name="com.nicron.webview.MainActivity"
            android:exported="true"
            android:configChanges="orientation|keyboardHidden|screenSize|smallestScreenSize|screenLayout"
            android:screenOrientation="sensorLandscape">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <meta-data android:name="nitron.backButton" android:value="history" />
            <meta-data android:name="nitron.clearCacheOnStart" android:value="false" />
            <meta-data android:name="nitron.splashBackground" android:value="#140c08" />
        </activity>
    </application>
</manifest>`;
const manPath = join(work, 'AndroidManifest.xml');
writeFileSync(manPath, manifest);

const compiled = join(work, 'compiled.zip');
execFileSync(aapt2, ['compile', '--dir', res, '-o', compiled], { stdio: 'inherit' });
const resApk = join(work, 'resources.apk');
execFileSync(
  aapt2,
  [
    'link',
    compiled,
    '--manifest',
    manPath,
    '-I',
    androidJar,
    '--min-sdk-version',
    '21',
    '--target-sdk-version',
    '34',
    '-o',
    resApk,
    '--auto-add-overlay',
  ],
  { stdio: 'inherit' },
);

const unsigned = new JSZip();
const resZip = await JSZip.loadAsync(readFileSync(resApk));
for (const [name, file] of Object.entries(resZip.files)) {
  if (file.dir) continue;
  const buf = await file.async('nodebuffer');
  const store = name === 'resources.arsc' || name === 'AndroidManifest.xml' || /\.(png|jpg|webp)$/i.test(name);
  unsigned.file(name, buf, { compression: store ? 'STORE' : 'DEFLATE' });
}

const base = await JSZip.loadAsync(readFileSync(baseApk));
unsigned.file('classes.dex', await base.file('classes.dex').async('nodebuffer'), { compression: 'DEFLATE' });

async function addDir(zip, abs, zipPath) {
  const { readdirSync, statSync } = await import('node:fs');
  for (const name of readdirSync(abs)) {
    const p = join(abs, name);
    const zp = zipPath + '/' + name;
    if (statSync(p).isDirectory()) await addDir(zip, p, zp);
    else {
      const buf = readFileSync(p);
      const store = /\.(png|jpg|webp|mp3|ogg)$/i.test(name);
      zip.file(zp, buf, { compression: store ? 'STORE' : 'DEFLATE' });
    }
  }
}
if (!existsSync(join(dist, 'index.html'))) {
  throw new Error('dist/ missing — run npm run build first');
}
await addDir(unsigned, dist, 'assets/www');

const unsignedBuf = await unsigned.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
const unsignedPath = join(outDir, 'Kifaru-APK-unsigned.apk');
writeFileSync(unsignedPath, unsignedBuf);

const attrs = [{ name: 'commonName', value: 'Kifaru Interactive' }, { name: 'organizationName', value: 'Kifaru Interactive' }];
const pems = await selfsigned.generate(attrs, { keySize: 2048, days: 3650, algorithm: 'sha256' });
console.log('cert keys', Object.keys(pems));
const priv = pems.private || pems.privateKey;
const cert = pems.cert || pems.certificate;
const keyPath = join(tools, 'debug-key.pem');
const certPath = join(tools, 'debug-cert.pem');
writeFileSync(keyPath, priv);
writeFileSync(certPath, cert);

const signer = new ApkSigner({
  signingKey: SigningKey.fromPEM(priv, cert),
});
const signed = await signer.sign(new Uint8Array(unsignedBuf));
const signedApk = signed.signedApk || signed;
const signedPath = join(outDir, 'Kifaru-APK-debug.apk');
writeFileSync(signedPath, signedApk);
rmSync(work, { recursive: true, force: true });
console.log('APK written:', signedPath, 'bytes', signedApk.length);
