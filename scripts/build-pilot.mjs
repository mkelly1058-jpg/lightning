import { build } from 'esbuild';
import { copyFile, mkdir, writeFile } from 'node:fs/promises';

const { PILOT_SUPABASE_URL: rawUrl, PILOT_SUPABASE_PUBLISHABLE_KEY: key } = process.env;

function publicConfig() {
  if (!rawUrl && !key) return null;
  if (!rawUrl || !key) throw new Error('Set both public pilot configuration variables.');
  const url = new URL(rawUrl);
  const local = ['localhost','127.0.0.1'].includes(url.hostname) && url.protocol === 'http:';
  const hosted = /^[a-z0-9]+\.supabase\.co$/.test(url.hostname) && url.protocol === 'https:' && !url.port;
  if (!(local || hosted) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Use the Supabase project origin for this environment.');
  }
  let legacyAnon = false;
  try {
    const parts=key.split('.');
    legacyAnon = parts.length===3 && JSON.parse(Buffer.from(parts[1], 'base64url').toString()).role === 'anon';
  } catch { /* Only a valid anon JWT can pass the fallback key check. */ }
  if (!/^sb_publishable_[a-zA-Z0-9_-]+$/.test(key) && !legacyAnon) throw new Error('Use a publishable or legacy anon key.');
  return {url:url.origin,key};
}

const config = publicConfig();
const output = 'build/pilot';
await mkdir(output+'/assets',{recursive:true});
await Promise.all([
  copyFile('pilot/index.html',output+'/index.html'),
  copyFile('pilot/pilot.css',output+'/pilot.css'),
  copyFile('dist/styles.css',output+'/styles.css'),
  copyFile('dist/assets/bolt.svg',output+'/assets/bolt.svg'),
  copyFile('dist/assets/track.webp',output+'/assets/track.webp'),
  writeFile(output+'/_headers',[
    '/*',
    '  X-Robots-Tag: noindex, nofollow',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: no-referrer',
    "  Content-Security-Policy: default-src 'self'; connect-src 'self'"+(config?' '+config.url:'')+"; img-src 'self' data:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
    ''
  ].join('\n')),
  build({
    entryPoints:['pilot/app.js'],bundle:true,format:'esm',platform:'browser',target:'es2022',outfile:output+'/app.js',
    define:{LIGHTNING_PILOT_CONFIG:JSON.stringify(config)}
  })
]);
