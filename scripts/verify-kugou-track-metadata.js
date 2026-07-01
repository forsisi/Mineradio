const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const repoRoot = path.resolve(__dirname, '..');
const serverSource = fs.readFileSync(path.join(repoRoot, 'server.js'), 'utf8');
const start = serverSource.indexOf('function firstKugouValue');
const end = serverSource.indexOf('function extractKugouSearchList');

if (start < 0 || end < 0 || end <= start) {
  throw new Error('Unable to locate KuGou mapping helpers in server.js');
}

const sandbox = { module: { exports: {} } };
vm.runInNewContext(
  serverSource.slice(start, end) + '\nmodule.exports = { mapKugouSearchSong };\n',
  sandbox,
  { filename: 'server-kugou-mapping.js' }
);

const { mapKugouSearchSong } = sandbox.module.exports;
const hash = '0123456789abcdef0123456789abcdef';

const fromFilename = mapKugouSearchSong({
  filename: 'HITA - 凛冬将至.mp3',
  Hash: hash,
});
assert.strictEqual(fromFilename.name, '凛冬将至');
assert.strictEqual(fromFilename.artist, 'HITA');

const fromAudioName = mapKugouSearchSong({
  audio_name: 'DADA(妲妲) - 王者荣耀.mp3',
  FileHash: hash,
});
assert.strictEqual(fromAudioName.name, '王者荣耀');
assert.strictEqual(fromAudioName.artist, 'DADA(妲妲)');

const withArtistField = mapKugouSearchSong({
  filename: '会哭的雨.mp3',
  author_name: 'Xing',
  hash,
});
assert.strictEqual(withArtistField.name, '会哭的雨');
assert.strictEqual(withArtistField.artist, 'Xing');

console.log('KuGou track metadata mapping is clean.');
