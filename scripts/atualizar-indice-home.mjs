/**
 * Reconstrói o índice de temas do blog dentro da home (index.html).
 *
 * Por que isso existe: o Search Console mostrou 21 páginas "Detectada, mas
 * não indexada", todas com último rastreamento N/D. A causa era que a maior
 * parte dos artigos só tinha link de entrada na /blog/, e a /blog/ não era
 * rastreada. O índice na home dá a cada artigo um link partindo da página
 * com autoridade do domínio. Este script garante que ele nunca fique
 * desatualizado quando a automação do blog publica um artigo novo.
 *
 * Uso: node scripts/atualizar-indice-home.mjs [--check]
 *   --check  não escreve nada, só falha se o índice estiver desatualizado.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const RAIZ = process.cwd();
const HOME = join(RAIZ, "index.html");
const BLOG = join(RAIZ, "blog");
const SOMENTE_CONFERIR = process.argv.includes("--check");

/** Curadoria dos grupos. A ordem aqui é a ordem que aparece na home. */
const GRUPOS = [
  {
    titulo: "Captação e anúncios",
    slugs: [
      "marketing-para-salao-de-beleza",
      "trafego-pago-para-salao-google-ou-meta",
      "google-ads-para-barbearia",
      "meta-ads-para-salao",
      "landing-page-para-salao",
      "publico-alvo-para-salao-de-beleza",
      "campanhas-sazonais-para-salao-de-beleza",
      "custo-de-aquisicao-de-clientes-para-salao"
    ],
    palavrasChave: ["anúncio", "ads", "tráfego", "captação", "aquisição", "landing", "marketing", "posicionamento"]
  },
  {
    titulo: "Google e reputação local",
    slugs: ["google-meu-negocio-para-salao", "seu-salao-aparece-no-google", "avaliacoes-no-google-para-salao-de-beleza"],
    palavrasChave: ["google", "seo", "reputação", "avaliaç"]
  },
  {
    titulo: "Recorrência e relacionamento",
    slugs: [
      "como-fidelizar-clientes-no-salao-de-beleza",
      "programa-de-indicacao-para-salao-de-beleza",
      "pesquisa-de-satisfacao-para-salao-de-beleza"
    ],
    palavrasChave: ["fideliz", "indicaç", "satisfaç", "relacionamento", "recorrência", "experiência"]
  },
  {
    titulo: "Atendimento e conversão",
    slugs: [
      "como-converter-leads-em-agendamentos",
      "taxa-de-conversao-da-recepcao-do-salao",
      "follow-up-para-salao-de-beleza",
      "como-reduzir-faltas-e-cancelamentos-no-salao",
      "taxa-de-ocupacao-da-agenda-do-salao",
      "ficha-de-cliente-para-salao-de-beleza"
    ],
    palavrasChave: ["atendimento", "conversão", "vendas", "agenda", "recepção", "follow"]
  },
  {
    titulo: "Por tipo de negócio",
    slugs: ["marketing-para-barbearia", "marketing-para-clinica-de-estetica", "consultoria-de-marketing-para-salao"],
    palavrasChave: ["barbearia", "clínica", "estética", "consultoria"]
  },
  {
    // Grupo padrão: artigo novo sem encaixe claro cai aqui.
    titulo: "Gestão e números",
    slugs: [
      "diagnostico-de-marketing-para-salao",
      "como-definir-metas-para-salao-de-beleza",
      "como-aumentar-ticket-medio-salao",
      "precificacao-de-servicos-para-salao-de-beleza",
      "dre-para-salao-de-beleza",
      "fluxo-de-caixa-para-salao-de-beleza",
      "controle-de-estoque-para-salao-de-beleza",
      "checklist-de-abertura-e-fechamento-do-salao",
      "gestao-de-equipe-para-salao-de-beleza",
      "desconto-em-salao-de-beleza",
      "seu-salao-funciona-sem-voce",
      "mix-de-servicos-para-salao-de-beleza"
    ],
    palavrasChave: ["gestão", "financ", "número", "indicador", "processo", "rentabilidade", "estratégia", "liderança"],
    padrao: true
  }
];

/** Rótulos curtos escritos à mão. Artigo fora daqui usa o próprio h1. */
const ROTULOS = {
  "marketing-para-salao-de-beleza": "Marketing para salão de beleza",
  "trafego-pago-para-salao-google-ou-meta": "Tráfego pago: Google ou Meta?",
  "google-ads-para-barbearia": "Google Ads para barbearia",
  "meta-ads-para-salao": "Meta Ads para salão",
  "landing-page-para-salao": "Landing page para salão",
  "publico-alvo-para-salao-de-beleza": "Público-alvo do salão",
  "campanhas-sazonais-para-salao-de-beleza": "Campanhas sazonais",
  "custo-de-aquisicao-de-clientes-para-salao": "Custo de aquisição de clientes",
  "google-meu-negocio-para-salao": "Google Meu Negócio para salão",
  "seu-salao-aparece-no-google": "Seu salão aparece no Google?",
  "avaliacoes-no-google-para-salao-de-beleza": "Avaliações no Google",
  "como-fidelizar-clientes-no-salao-de-beleza": "Como fidelizar clientes",
  "programa-de-indicacao-para-salao-de-beleza": "Programa de indicação",
  "pesquisa-de-satisfacao-para-salao-de-beleza": "Pesquisa de satisfação",
  "como-converter-leads-em-agendamentos": "Converter leads em agendamentos",
  "taxa-de-conversao-da-recepcao-do-salao": "Taxa de conversão da recepção",
  "follow-up-para-salao-de-beleza": "Follow-up de contatos",
  "como-reduzir-faltas-e-cancelamentos-no-salao": "Reduzir faltas e cancelamentos",
  "taxa-de-ocupacao-da-agenda-do-salao": "Taxa de ocupação da agenda",
  "ficha-de-cliente-para-salao-de-beleza": "Ficha de cliente",
  "marketing-para-barbearia": "Marketing para barbearia",
  "marketing-para-clinica-de-estetica": "Marketing para clínica de estética",
  "consultoria-de-marketing-para-salao": "Consultoria de marketing",
  "diagnostico-de-marketing-para-salao": "Diagnóstico de marketing",
  "como-definir-metas-para-salao-de-beleza": "Como definir metas",
  "como-aumentar-ticket-medio-salao": "Aumentar o ticket médio",
  "precificacao-de-servicos-para-salao-de-beleza": "Precificação de serviços",
  "dre-para-salao-de-beleza": "DRE do salão",
  "fluxo-de-caixa-para-salao-de-beleza": "Fluxo de caixa",
  "controle-de-estoque-para-salao-de-beleza": "Controle de estoque",
  "checklist-de-abertura-e-fechamento-do-salao": "Checklist de abertura e fechamento",
  "gestao-de-equipe-para-salao-de-beleza": "Gestão de equipe",
  "desconto-em-salao-de-beleza": "Desconto sem perder margem",
  "seu-salao-funciona-sem-voce": "Seu salão funciona sem você?",
  "mix-de-servicos-para-salao-de-beleza": "Mix de serviços do salão"
};

function escapar(texto) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function semAcento(texto) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function lerPost(slug) {
  const arquivo = join(BLOG, slug, "index.html");
  if (!existsSync(arquivo)) return null;
  const html = readFileSync(arquivo, "utf8");
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const categoria = html.match(/class="article-category"[^>]*>([\s\S]*?)</);
  const titulo = h1 ? h1[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : slug;
  return {
    slug,
    titulo,
    // "Mix de serviços: como organizar" -> "Mix de serviços"
    rotulo: ROTULOS[slug] || titulo.split(":")[0].trim(),
    categoria: categoria ? categoria[1].replace(/<[^>]+>/g, "").trim() : ""
  };
}

function listarPosts() {
  return readdirSync(BLOG, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(BLOG, e.name, "index.html")))
    .map((e) => lerPost(e.name))
    .filter(Boolean);
}

function escolherGrupo(post) {
  const jaCurado = GRUPOS.find((g) => g.slugs.includes(post.slug));
  if (jaCurado) return jaCurado;
  const alvo = semAcento(`${post.categoria} ${post.titulo}`);
  const porPalavra = GRUPOS.find((g) => g.palavrasChave.some((p) => alvo.includes(semAcento(p))));
  return porPalavra || GRUPOS.find((g) => g.padrao);
}

function montarIndice(posts) {
  const porGrupo = new Map(GRUPOS.map((g) => [g.titulo, []]));
  const novos = [];

  // primeiro os curados, na ordem definida acima
  for (const grupo of GRUPOS) {
    for (const slug of grupo.slugs) {
      const post = posts.find((p) => p.slug === slug);
      if (post) porGrupo.get(grupo.titulo).push(post);
    }
  }
  // depois os que a automação publicou e ainda não foram curados
  for (const post of posts) {
    if (GRUPOS.some((g) => g.slugs.includes(post.slug))) continue;
    const grupo = escolherGrupo(post);
    porGrupo.get(grupo.titulo).push(post);
    novos.push(`${post.slug} -> ${grupo.titulo}`);
  }

  // Distribui os grupos em 4 colunas. Os maiores primeiro, cada um na coluna
  // mais vazia, senão um grupo grande cai numa coluna que já estava cheia.
  const colunas = [[], [], [], []];
  const carga = [0, 0, 0, 0];
  const porTamanho = GRUPOS.filter((g) => porGrupo.get(g.titulo).length).sort(
    (a, b) => porGrupo.get(b.titulo).length - porGrupo.get(a.titulo).length
  );
  for (const grupo of porTamanho) {
    const itens = porGrupo.get(grupo.titulo);
    const menor = carga.indexOf(Math.min(...carga));
    colunas[menor].push({ titulo: grupo.titulo, itens });
    carga[menor] += itens.length + 1;
  }

  const partes = colunas
    .filter((c) => c.length)
    .map((coluna) => {
      const blocos = coluna
        .map(({ titulo, itens }) => {
          const lis = itens
            .map((p) => `            <li><a href="/blog/${p.slug}/">${escapar(p.rotulo)}</a></li>`)
            .join("\n");
          return `          <h4>${escapar(titulo)}</h4>\n          <ul>\n${lis}\n          </ul>`;
        })
        .join("\n\n");
      return `        <div class="blog-index-col">\n${blocos}\n        </div>`;
    })
    .join("\n\n");

  const html =
    `    <nav class="blog-index fade-in-up" aria-labelledby="blog-index-heading">\n` +
    `      <h3 id="blog-index-heading" class="blog-index-title">Todos os temas</h3>\n` +
    `      <div class="blog-index-grid">\n${partes}\n      </div>\n` +
    `    </nav>`;

  return { html, novos };
}

const posts = listarPosts();
if (!posts.length) {
  console.error("Nenhum artigo encontrado em blog/. Nada a fazer.");
  process.exit(1);
}

const { html, novos } = montarIndice(posts);
const home = readFileSync(HOME, "utf8");
const marcador = /[ \t]*<nav class="blog-index[\s\S]*?<\/nav>/;

if (!marcador.test(home)) {
  console.error("Bloco <nav class=\"blog-index\"> não encontrado em index.html.");
  process.exit(1);
}

const atualizada = home.replace(marcador, html);
const mudou = atualizada !== home;

const linkados = (html.match(/href="\/blog\//g) || []).length;
console.log(`Artigos em blog/: ${posts.length} | linkados no índice: ${linkados}`);
if (novos.length) console.log(`Novos encaixados automaticamente:\n  ${novos.join("\n  ")}`);

if (linkados !== posts.length) {
  console.error("Divergência: nem todo artigo entrou no índice.");
  process.exit(1);
}

if (!mudou) {
  console.log("Índice da home já estava atualizado.");
  process.exit(0);
}

if (SOMENTE_CONFERIR) {
  console.error("Índice da home está desatualizado. Rode: node scripts/atualizar-indice-home.mjs");
  process.exit(1);
}

writeFileSync(HOME, atualizada);
console.log("index.html atualizado.");
