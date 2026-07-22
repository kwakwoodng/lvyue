'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
const publicFiles = [
  'index.html',
  'styles.css',
  'apple.css',
  'cloudbase-sdk.js',
  'cloudbase-config.js',
  'cloudbase-api.js',
  'cloud-enhancements.js',
  'app.js'
];

function localEnvironment() {
  const file = path.join(root, '.env.local');
  if (!fs.existsSync(file)) return {};
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).reduce((values, line) => {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) values[match[1]] = match[2].trim();
    return values;
  }, {});
}

const local = localEnvironment();
const environment = {
  VITE_CLOUDBASE_ENV_ID: process.env.VITE_CLOUDBASE_ENV_ID || local.VITE_CLOUDBASE_ENV_ID || 'lvyue-d6gyatb4a502c0235',
  VITE_CLOUDBASE_REGION: process.env.VITE_CLOUDBASE_REGION || local.VITE_CLOUDBASE_REGION || 'ap-shanghai',
  VITE_CLOUDBASE_ACCESS_KEY: process.env.VITE_CLOUDBASE_ACCESS_KEY || local.VITE_CLOUDBASE_ACCESS_KEY || ''
};

if (!environment.VITE_CLOUDBASE_ACCESS_KEY) {
  throw new Error('缺少 VITE_CLOUDBASE_ACCESS_KEY，无法生成生产版本');
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of publicFiles) {
  const source = path.join(root, file);
  let content = fs.readFileSync(source, 'utf8');
  if (file === 'index.html') {
    for (const [name, value] of Object.entries(environment)) {
      content = content.replaceAll(`%${name}%`, String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'"));
    }
  }
  fs.writeFileSync(path.join(output, file), content, 'utf8');
}

console.log(`旅页生产文件已生成：${output}`);
