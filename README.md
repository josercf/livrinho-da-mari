# Livrinho da Mari

Quinze dias de comidinhas para a Mari e para a Lala, de terça, 20/10, a terça, 03/11. O site tem o cardápio de cada dia, a receita do prato principal, a lista de compras com caixinhas para marcar e a foto de cada prato.

Endereço do site: https://josercf.github.io/livrinho-da-mari/

## Como está organizado

- `site/index.html` é a página inteira, com os cardápios, as receitas e a lista de compras.
- `prompts.json` guarda o prompt de cada foto. Ele fica fora do site e não aparece para quem visita.
- `site/img/` guarda as fotos, uma por dia (`dia-01.webp` até `dia-15.webp`) e a `capa.jpg`, que aparece quando o link é compartilhado no WhatsApp.
- `scripts/gerar-fotos.mjs` gera as fotos com o Nano Banana, pela API do Gemini.
- `.github/workflows/` tem duas automações. Uma publica o site a cada mudança. A outra gera as fotos quando você manda.

## Publicação

Cada mudança na branch main publica o site sozinha, em um ou dois minutos. A automação que faz isso é a Publicar no GitHub Pages. Não crie outra pelo menu do Pages, porque ela publicaria o repositório inteiro no lugar da pasta do site.

## Lista de compras

A lista está dividida em três idas. A compra grande, na segunda 19/10, traz carnes, mercearia e o que dura duas semanas. A feira da semana 1, no mesmo dia, e a da semana 2, na segunda 26/10, trazem fruta, folha, leite, iogurte, muçarela e pão.

Para gerar fotos pelo GitHub, a chave do Gemini precisa estar salva em Settings, depois Secrets and variables, depois Actions, com o nome `GEMINI_API_KEY`. As chaves são criadas em https://aistudio.google.com/apikey.

## Trocar uma foto

Mude o prompt do dia em `prompts.json`, rode Gerar fotos dos pratos com o número do dia no campo de dias e marque Refazer.

Também dá para rodar no computador:

```bash
npm install
GEMINI_API_KEY=sua-chave npm run fotos -- --dias=3 --refazer
```

## Modelo usado

O script tenta, nesta ordem, o Nano Banana 2.1, o Nano Banana 2, o Nano Banana Pro e o Nano Banana original, e fica com o primeiro que responder. Para forçar um modelo, crie uma variável `GEMINI_IMAGE_MODEL` em Settings, depois Secrets and variables, depois Actions, na aba Variables.

## Um lembrete

O site no GitHub Pages é público. Qualquer pessoa com o link consegue abrir. Confirme com a obstetra a suplementação de ácido fólico, ferro e DHA.
