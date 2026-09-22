// All preview sources resolve inside this checkout; no sibling worktree fallback.
const path = require('node:path');
const repoRoot = path.resolve(__dirname, '../..');
module.exports = {
  repoRoot,
  localRoot: __dirname,
  storySourceRoot: path.join(__dirname, 'vendor/story-source'),
  siteSourceRoot: path.join(__dirname, 'vendor/site-source'),
  cacheRoot: path.join(repoRoot, 'scripts/.cache'),
};
