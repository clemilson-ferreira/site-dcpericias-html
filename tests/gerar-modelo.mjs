// Gera uma proposta em PDF. Uso: node tests/gerar-modelo.mjs saida.pdf [dados.json]
// Sem dados.json usa os dados do modelo "Proposta 003-180926".
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { gerarProposta } from '../area/proposta/proposta-pdf.js';

const require = createRequire(import.meta.url);
const { jsPDF } = require(process.env.JSPDF_NODE || 'jspdf');
const dir = join(dirname(fileURLToPath(import.meta.url)), '../area/assets/papel-timbrado');
const tiras = readdirSync(dir).filter((f) => f.endsWith('.jpg')).sort().map((f) => new Uint8Array(readFileSync(join(dir, f))));
const dados = process.argv[3] ? JSON.parse(readFileSync(process.argv[3], 'utf8')) : {};
const doc = gerarProposta(jsPDF, tiras, dados);
writeFileSync(process.argv[2], Buffer.from(doc.output('arraybuffer')));
console.log('ok', doc.getNumberOfPages(), 'páginas');
