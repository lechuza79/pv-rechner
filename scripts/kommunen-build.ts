/** Build the reviewed composition from the same shared components as the preview. */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, rm, rename, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { scrollTemplate } from '../docs/design/kommunen/scroll-template';
import { kommunenMetadata } from '../lib/kommunen-seite';
import { tokens, globalStyles } from '../lib/theme';
import { siteFussHtml } from '../lib/site-fuss';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'docs/design/kommunen');
const temporary = resolve(source, '.generated-release');
const output = resolve(root, 'public/kommunen');
const assets = resolve(temporary, 'public');

async function main() {
  // Never substitute foreign working directories or development servers in a release.
  for (const file of [
    'components/landscape/LandscapeHero.tsx',
    'lib/landscape-places.ts',
    'components/gemeinde/GemeindeWidgetGroup.tsx',
    'app/(embed)/embed/regional-map/page.tsx',
    'app/(embed)/embed/galerie/[widget]/page.tsx',
  ]) {
    await access(resolve(root, file)).catch(() => {
      throw new Error(`Municipal release dependency missing: ${file}. Integrate its reviewed owner commit first.`);
    });
  }
  await rm(temporary, { recursive: true, force: true });
  await mkdir(assets, { recursive: true });
  // Independently loaded CSS bundles must retain unique module names.
  // Identifier minification assigns the same short classes in both bundles.
  const runtime = { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' };
  await build({
    entryPoints: [resolve(source, 'shared.tsx')], bundle: true, platform: 'node', format: 'cjs',
    packages: 'external', jsx: 'automatic', loader: { '.css': 'local-css' }, external: ['/fonts/*'],
    plugins: [{ name: 'server-runtime', setup(b) {
      // This bundle is executed only by this Node build process, never in the browser.
      b.onResolve({ filter: /^server-only$/ }, () => ({ path: 'server-only', namespace: 'server-runtime' }));
      b.onLoad({ filter: /.*/, namespace: 'server-runtime' }, () => ({ contents: '', loader: 'js' }));
    } }], outfile: resolve(temporary, 'shared.cjs'),
  });
  await build({
    entryPoints: [resolve(source, 'client.tsx')], bundle: true, platform: 'browser', format: 'esm',
    jsx: 'automatic', minifySyntax: true, minifyWhitespace: true, minifyIdentifiers: false,
    external: ['/design/*', '/shared-nav/*', '/homepage-study/*', '/fonts/*', '/brand/*'],
    define: runtime, outfile: resolve(assets, 'municipal-client.js'),
  });
  await build({
    entryPoints: [resolve(source, 'landscape-client.tsx')], bundle: true, platform: 'browser', format: 'esm',
    jsx: 'automatic', minifySyntax: true, minifyWhitespace: true, minifyIdentifiers: false, loader: { '.module.css': 'local-css' },
    alias: {
      'react': resolve(root, 'node_modules/react'), 'react-dom': resolve(root, 'node_modules/react-dom'),
      'shared-landscape-hero': resolve(root, 'components/landscape/LandscapeHero.tsx'),
      'shared-landscape-places': resolve(root, 'lib/landscape-places.ts'),
      'shared-landscape-styles': resolve(root, 'components/landkreis/wind-map.module.css'),
    },
    external: ['/fonts/*', '/design/*'], define: runtime, outfile: resolve(assets, 'landscape-client.js'),
  });
  const shared = createRequire(import.meta.url)(resolve(temporary, 'shared.cjs'));
  const template = await readFile(resolve(source, 'kommunen.html'), 'utf8');
  const fallbackHero = template.match(/<section class="sc-waitlist-preview">[\s\S]*?<\/section>/)?.[0];
  if (!fallbackHero) throw new Error('Reviewed hero text missing from municipal composition.');
  let html = shared.renderSharedParts(scrollTemplate(template))
    .replace('<div id="municipal-landscape-hero"></div>', `<div id="municipal-landscape-hero"><header class="site-header">${shared.NEON_KOPF_INNEN}</header>${fallbackHero}</div>`)
    .replace(/<title>[\s\S]*?<\/title>/, kommunenMetadata())
    .replace('<meta name="robots" content="noindex,nofollow">', '')
    .replace(/<p class="draft-note">[\s\S]*?<\/p>/, '')
    .replace('<!-- SHARED_FOOTER -->', siteFussHtml())
    .replace('<!-- SHARED_NAV -->', `<script type="module">${shared.NEON_NAV_SKRIPT}</script>`)
    .replace('</head>', `${shared.NAV_TOKENS_HTML}${shared.ANALYTICS_HTML}</head>`);
  // Render the fallback CTA through the same shared editorial component as all other CTAs.
  html = shared.renderSharedParts(html);
  for (const file of ['kommunen.css', 'theme.css', 'shared-components.css', 'municipal-client.js', 'municipal-client.css', 'landscape-client.js', 'landscape-client.css', 'landscape-shell.css']) {
    html = html.replaceAll(`"/${file}"`, `"/kommunen/${file}"`);
  }
  html = html.replaceAll('"/shared-person/person-box.css"', '"/kommunen/person-box.css"');
  if (/127\.0\.0\.1|localhost|noindex|\{\{/.test(html)) throw new Error('Local-only content leaked into municipal release.');
  const scope = (css: string) => '@scope (#municipal-landscape-hero) to (.site-header, .municipal-hero-place){' + css + '}';
  const shell = await Promise.all(['gemeinde/basis.css', 'hero-system/hero.css'].map(file => readFile(resolve(root, 'public', file), 'utf8')));
  await writeFile(resolve(assets, 'landscape-client.css'), scope(await readFile(resolve(assets, 'landscape-client.css'), 'utf8')));
  await writeFile(resolve(assets, 'landscape-shell.css'), scope(shell.join('\n')));
  await writeFile(resolve(assets, 'person-box.css'), '@scope (.homepage-study:has(> .hs-person-section)){' + await readFile(resolve(root, 'public/shared-person/person-box.css'), 'utf8') + '}');
  await writeFile(resolve(assets, 'theme.css'), ':root{' + Object.entries(tokens).map(([k,v]) => `${k}:${v};`).join('') + '}' + globalStyles);
  await writeFile(resolve(assets, 'shared-components.css'), await readFile(resolve(temporary, 'shared.css')));
  await writeFile(resolve(assets, 'kommunen.css'), await readFile(resolve(source, 'kommunen.css')));
  await writeFile(resolve(assets, 'index.html'), html);
  // Only replace the public output after all dependencies and bundles succeeded.
  await rm(output, { recursive: true, force: true });
  await rename(assets, output);
  console.log('Municipal page built: /fuer-organisationen/kommunen');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
