#!/usr/bin/env node
// Gera as fotos dos 15 pratos do livrinho com o Nano Banana (API do Gemini).
//
// Uso:
//   GEMINI_API_KEY=sua-chave node scripts/gerar-fotos.mjs            gera só as fotos que faltam
//   GEMINI_API_KEY=sua-chave node scripts/gerar-fotos.mjs --dias=3,8  gera só esses dias
//   GEMINI_API_KEY=sua-chave node scripts/gerar-fotos.mjs --refazer   refaz todas
//
// Os prompts ficam em prompts.json, na raiz do repositório, fora do site.
// Para mudar uma foto, mude o prompt do dia lá e rode de novo com --dias=N --refazer.

import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arquivoPrompts = path.join(raiz, 'prompts.json');
const pastaImg = path.join(raiz, 'site', 'img');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const chave = (process.env.GEMINI_API_KEY || '').trim();

const args = process.argv.slice(2);
const refazer = args.includes('--refazer') || process.env.REFAZER === 'true';
const diasTexto = (args.find((a) => a.startsWith('--dias='))?.slice(7) ?? process.env.DIAS ?? '').trim();
const diasPedidos = diasTexto ? diasTexto.split(/[,\s]+/).filter(Boolean).map(Number) : null;

// Do mais novo para o mais antigo. O primeiro que responder é usado para todos os pratos.
const MODELOS = process.env.GEMINI_IMAGE_MODEL
  ? [process.env.GEMINI_IMAGE_MODEL.trim()]
  : [
      'gemini-nano-banana-2.1',
      'gemini-3.1-flash-image',
      'gemini-3-pro-image',
      'gemini-3-pro-image-preview',
      'gemini-2.5-flash-image',
    ];

const ESTILO =
  ' Fotografia realista de culinária caseira brasileira, sem texto, sem letras, sem logotipos, ' +
  'sem pessoas, sem mãos, sem marca d\'água, enquadramento horizontal 4:3.';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function carregarPratos(arquivo = arquivoPrompts) {
  const lista = JSON.parse(await readFile(arquivo, 'utf8'));
  return lista
    .filter((p) => p && Number.isInteger(p.dia) && typeof p.prompt === 'string' && p.prompt.trim())
    .map((p) => ({ n: p.dia, titulo: p.prato || `Dia ${p.dia}`, prompt: p.prompt.trim() }));
}

// Reconhece PNG, JPEG e WebP pelos primeiros bytes.
function ehImagem(buf) {
  if (buf.length < 12) return false;
  const png = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const jpg = buf[0] === 0xff && buf[1] === 0xd8;
  const webp = buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP';
  return png || jpg || webp;
}

// Procura a imagem em qualquer formato de resposta: inlineData (generateContent),
// output_image ou blocos de conteúdo com type "image" (Interactions).
export function acharImagem(json) {
  const pilha = [json];
  while (pilha.length) {
    const no = pilha.pop();
    if (!no || typeof no !== 'object') continue;
    if (typeof no.data === 'string' && no.data.length > 1000) {
      const buf = Buffer.from(no.data, 'base64');
      if (ehImagem(buf)) return buf;
    }
    for (const v of Object.values(no)) if (v && typeof v === 'object') pilha.push(v);
  }
  return null;
}

function motivoSemImagem(json) {
  const c = json?.candidates?.[0];
  return (
    c?.finishReason ||
    json?.promptFeedback?.blockReason ||
    json?.output_text ||
    c?.content?.parts?.find((p) => p.text)?.text ||
    'a resposta veio sem imagem'
  );
}

async function chamar(url, corpo) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': chave },
    body: JSON.stringify(corpo),
  });
  const texto = await r.text();
  let json = null;
  try { json = JSON.parse(texto); } catch { /* resposta não era JSON */ }
  return { status: r.status, json, texto };
}

const METODOS = {
  interactions: (modelo, prompt) =>
    chamar(`${API}/interactions`, {
      model: modelo,
      input: [{ type: 'text', text: prompt }],
      response_format: { type: 'image', mime_type: 'image/png', aspect_ratio: '4:3' },
    }),
  generateContent: (modelo, prompt) =>
    chamar(`${API}/models/${modelo}:generateContent`, {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '4:3' } },
    }),
};

let combinacaoQueFunciona = null; // { modelo, metodo }

async function gerarImagem(prompt) {
  const tentativas = combinacaoQueFunciona
    ? [combinacaoQueFunciona]
    : MODELOS.flatMap((modelo) => Object.keys(METODOS).map((metodo) => ({ modelo, metodo })));
  const erros = [];

  for (const t of tentativas) {
    for (let rodada = 1; rodada <= 4; rodada++) {
      const { status, json, texto } = await METODOS[t.metodo](t.modelo, prompt);

      if (status === 200) {
        const buf = acharImagem(json);
        if (buf) {
          if (!combinacaoQueFunciona) {
            combinacaoQueFunciona = t;
            console.log(`  usando ${t.modelo} pela API ${t.metodo}`);
          }
          return buf;
        }
        if (combinacaoQueFunciona) throw new Error(`sem imagem: ${motivoSemImagem(json)}`);
        erros.push(`${t.modelo}/${t.metodo}: ${motivoSemImagem(json)}`);
        break;
      }

      const msg = json?.error?.message || texto.slice(0, 200);
      if (status === 401 || status === 403) {
        throw new Error(`a chave do Gemini foi recusada (${status}): ${msg}`);
      }
      if (status === 429 || status >= 500) {
        if (rodada === 4) {
          erros.push(`${t.modelo}/${t.metodo}: ${status} depois de 4 tentativas: ${msg}`);
          break;
        }
        const espera = 15000 * rodada;
        console.log(`  limite ou instabilidade (${status}), esperando ${espera / 1000}s`);
        await esperar(espera);
        continue;
      }
      erros.push(`${t.modelo}/${t.metodo}: ${status} ${msg}`);
      break;
    }
  }
  throw new Error(`nenhum modelo gerou a imagem.\n    ${erros.join('\n    ')}`);
}

async function existe(arquivo) {
  try { await access(arquivo); return true; } catch { return false; }
}

async function main() {
  if (!chave) {
    console.error('Falta a chave. Defina GEMINI_API_KEY (no GitHub: Settings > Secrets and variables > Actions).');
    process.exit(1);
  }

  const pratos = await carregarPratos();
  const fila = [];
  for (const p of pratos) {
    if (diasPedidos && !diasPedidos.includes(p.n)) continue;
    const destino = path.join(pastaImg, `dia-${String(p.n).padStart(2, '0')}.webp`);
    if (!refazer && (await existe(destino))) continue;
    fila.push({ ...p, destino });
  }

  if (!fila.length) {
    console.log('Todas as fotos pedidas já existem. Use --refazer para gerar de novo.');
    return;
  }

  console.log(`Gerando ${fila.length} foto(s)...`);
  let ok = 0;
  const falhas = [];
  for (const p of fila) {
    console.log(`Dia ${p.n}: ${p.titulo}`);
    try {
      const bruto = await gerarImagem(p.prompt + ESTILO);
      await sharp(bruto).resize(1280, 960, { fit: 'cover' }).webp({ quality: 82 }).toFile(p.destino);
      if (p.n === 1) {
        await sharp(bruto)
          .resize(1200, 630, { fit: 'cover' })
          .jpeg({ quality: 85, mozjpeg: true })
          .toFile(path.join(pastaImg, 'capa.jpg'));
      }
      ok++;
      console.log(`  salva em site/img/${path.basename(p.destino)}`);
    } catch (e) {
      falhas.push(p.n);
      console.error(`  falhou: ${e.message}`);
      if (/chave do Gemini foi recusada/.test(e.message)) break;
    }
    await esperar(2000);
  }

  console.log(`\nPronto: ${ok} de ${fila.length} foto(s) gerada(s).`);
  if (falhas.length) console.log(`Faltaram os dias ${falhas.join(', ')}. Rode de novo com --dias=${falhas.join(',')}.`);
  if (ok === 0) process.exit(1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
