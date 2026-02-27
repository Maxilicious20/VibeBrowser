const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const rendererSrc = path.join(projectRoot, 'src', 'renderer');
const stylesSrc = path.join(projectRoot, 'src', 'styles');
const rendererDist = path.join(projectRoot, 'dist', 'renderer');

const assets = [
  {
    from: path.join(rendererSrc, 'index.html'),
    to: path.join(rendererDist, 'index.html'),
  },
  {
    from: path.join(rendererSrc, 'changelog.html'),
    to: path.join(rendererDist, 'changelog.html'),
  },
  {
    from: path.join(stylesSrc, 'vibe.css'),
    to: path.join(rendererDist, 'vibe.css'),
  },
];

fs.mkdirSync(rendererDist, { recursive: true });

assets.forEach(({ from, to }) => {
  if (!fs.existsSync(from)) {
    console.warn(`[copy-renderer-assets] Missing file: ${from}`);
    return;
  }
  fs.copyFileSync(from, to);
});

console.log('[copy-renderer-assets] Renderer assets copied.');
