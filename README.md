# Livrinho da Mari

Quinze dias de comidinhas para a Mari e para a Lala, de terça, 20/10, a terça, 03/11. O site tem o cardápio de cada dia, a receita do prato principal, a lista de compras com caixinhas para marcar e a foto de cada prato.

Endereço do site: https://josercf.github.io/livrinho-da-mari/

## Como está organizado

- `site/index.html` é a página inteira. Os textos, as receitas e os prompts das fotos estão todos nela.
- `site/img/` guarda as fotos, uma por dia (`dia-01.webp` até `dia-15.webp`) e a `capa.jpg`, que aparece quando o link é compartilhado no WhatsApp.
- `scripts/gerar-fotos.mjs` gera as fotos com o Nano Banana, pela API do Gemini.
- `.github/workflows/` tem duas automações. Uma publica o site a cada mudança. A outra gera as fotos quando você manda.

## Primeira vez

1. Crie uma chave em https://aistudio.google.com/apikey.
2. No repositório, abra Settings, depois Secrets and variables, depois Actions. Clique em New repository secret, use o nome `GEMINI_API_KEY` e cole a chave.
3. Em Settings, depois Pages, escolha GitHub Actions como Source.
4. Na aba Actions, abra Gerar fotos dos pratos e clique em Run workflow.

Em alguns minutos as fotos aparecem em `site/img/` e o site é publicado de novo com elas.

## Trocar uma foto

Mude o prompt do dia dentro de `site/index.html`, rode Gerar fotos dos pratos com o número do dia no campo de dias e marque Refazer.

Também dá para rodar no computador:

```bash
npm install
GEMINI_API_KEY=sua-chave npm run fotos -- --dias=3 --refazer
```

## Modelo usado

O script tenta, nesta ordem, o Nano Banana 2.1, o Nano Banana 2, o Nano Banana Pro e o Nano Banana original, e fica com o primeiro que responder. Para forçar um modelo, crie uma variável `GEMINI_IMAGE_MODEL` em Settings, depois Secrets and variables, depois Actions, na aba Variables.

## Um lembrete

O site no GitHub Pages é público. Qualquer pessoa com o link consegue abrir. Confirme com a obstetra a suplementação de ácido fólico, ferro e DHA.
