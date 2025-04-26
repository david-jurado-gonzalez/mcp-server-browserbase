import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Determinar el path de Chrome basado en el sistema operativo
const chromePath = process.platform === 'win32'
  ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  : process.platform === 'darwin'
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : 'google-chrome';

// Argumentos para Chrome
const args = [
  '--remote-debugging-port=9223',
  '--user-data-dir=' + join(__dirname, 'chrome-debug-profile'),
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank'
];

// Lanzar Chrome
const chrome = spawn(chromePath, args, {
  stdio: 'inherit'
});

console.log('Chrome iniciado en modo debug en el puerto 9223');

// Manejar el cierre del proceso
process.on('SIGINT', () => {
  chrome.kill();
  process.exit();
});

chrome.on('exit', (code) => {
  console.log(`Chrome se ha cerrado con código: ${code}`);
  process.exit(code);
});