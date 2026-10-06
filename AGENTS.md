# Instruções para agentes neste repositório

Site da Agência Beleza na Capital. Qualquer agente que trabalhe aqui, de qualquer
ferramenta, segue o que está neste arquivo.

Regras gerais de escrita: português do Brasil, sem emoji e sem travessão. Nunca
invente resultado, estatística, depoimento ou número de cliente.

## Pauta do blog: leia o radar antes de escolher o tema

O site é medido. Todo clique, abertura de página, rolagem e saída vira linha na
planilha do radar, e uma rotina diária transforma isso em `PAUTA-DO-BLOG.md`, na
raiz deste repositório.

**Antes de escolher o tema do artigo do dia, abra `PAUTA-DO-BLOG.md`.** Ele diz
quais artigos estão realmente sendo abertos, com quantas aberturas por dia cada
um teve, e traz temas sugeridos a partir disso.

Como usar, por dia da semana:

- **Segunda, quarta e sexta: a pauta manda.** Escolha um dos temas sugeridos em
  `PAUTA-DO-BLOG.md`, ou um ângulo novo do mesmo assunto que está puxando
  tráfego. A ideia é aprofundar o que o público já demonstrou querer ler.
- **Terça, quinta, sábado e domingo: tema livre.** Escolha um assunto novo, fora
  do que a pauta aponta. Isso existe de propósito: o blog precisa continuar
  descobrindo assunto que ainda não existe no site, senão vira monotema e passa
  a competir com os próprios artigos na busca.

Em qualquer dia, as regras de sempre continuam valendo: não repetir slug, título,
palavra-chave nem intenção de busca de artigo que já existe. Se o tema sugerido
pela pauta já estiver coberto por um artigo publicado, pegue o próximo da lista
ou um recorte diferente, nunca um quase-duplicado.

Se `PAUTA-DO-BLOG.md` estiver desatualizado (a data no topo não é de hoje nem de
ontem), siga como se fosse dia livre e diga isso no relatório final.

## O que o radar mede

- `/js/radar.js` carrega em todas as páginas e manda os eventos para um Apps
  Script, que grava na planilha "BNC — Leads do Site (Radar)", aba Funil.
- Eventos: `pageview`, `click`, `step`, `abandon`, `wa_click`, `exit`.
- Microsoft Clarity (projeto `yr5906jrg2`) e Google Analytics 4 (propriedade
  Site BNC, `G-EPS6QQ2Z0C`) rodam em paralelo.

**Toda página nova precisa sair com as três tags no `<head>`:** o carregador do
`gtag/js` com o ID do GA4, o snippet do Clarity e `<script src="/js/radar.js"
defer></script>`. Artigo publicado sem isso nasce invisível para a pauta e some
da medição. Para conferir o site inteiro:

```bash
for f in $(git ls-files '*.html'); do grep -q '/js/radar.js' "$f" || echo "$f"; done
git ls-files '*.html' | xargs grep -L 'clarity.ms'
```
