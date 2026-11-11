// Start both repositories locally; production npm start keeps using API_BASE_URL.
const path = require('node:path');
const fs = require('node:fs');
const { spawn } = require('node:child_process');
require('dotenv').config();
const apiDir = process.env.LOCAL_API_DIR || path.resolve(__dirname, '../../Daily-Element-API');
const python = process.env.LOCAL_API_PYTHON || path.join(apiDir, 'env/bin/python');
if (!fs.existsSync(path.join(apiDir, 'app.py')) || !fs.existsSync(python)) {
  console.error('Local API missing. Set LOCAL_API_DIR and LOCAL_API_PYTHON to the API repository and its Python environment.');
  process.exit(1);
}
const apiPort = process.env.LOCAL_API_PORT || '8000';
const api = spawn(python, ['app.py'], {
  cwd: apiDir,
  // The browser and local API share the device clock. Use a remote clock for archives.
  env: { ...process.env, PORT: apiPort, PYTHONDONTWRITEBYTECODE: '1',
    ARCHIVE_TIME_SOURCE_URL: process.env.ARCHIVE_TIME_SOURCE_URL ||
      new URL('/', process.env.API_BASE_URL || 'https://daily-element-api-production.up.railway.app').href
  },
  stdio: 'inherit'
});
// Restart the frontend when page templates or assets change: the server keeps
// both HTML templates and content-hashed assets in memory until it restarts.
const rootDir = path.resolve(__dirname, '..');
const watchPaths = ['server.js', 'lib', 'scripts', 'styles', 'data', 'images', 'fonts',
  ...fs.readdirSync(rootDir).filter(name => name.endsWith('.html'))];
const watchArgs = watchPaths.map(name => '--watch-path=' + path.join(rootDir, name));
const web = spawn(process.execPath, ['--watch', ...watchArgs, path.join(rootDir, 'server.js')], {
  env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${apiPort}` },
  stdio: 'inherit'
});
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  api.kill('SIGTERM');
  web.kill('SIGTERM');
  process.exitCode = code;
}
for (const child of [api, web]) {
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => stop(code || 0));
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
