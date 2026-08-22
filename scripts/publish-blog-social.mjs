import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve, sep } from "node:path";

const SITE_BASE_URL = (process.env.SITE_BASE_URL || "https://www.belezanacapital.com.br").replace(/\/$/, "");
const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v26.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;
const BUSINESS_ID = process.env.META_BUSINESS_ID || "521532175593406";
const EXPECTED_PAGE_ID = process.env.META_PAGE_ID || "102252752160102";
const TOKEN = process.env.META_SYSTEM_USER_TOKEN || "";
const DRY_RUN = process.env.DRY_RUN === "true";
const REPO_ROOT = process.cwd();

const sleep = (milliseconds) => new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

function fail(message) {
  throw new Error(message);
}

function safeError(error) {
  const raw = error instanceof Error ? error.message : String(error);
  return TOKEN ? raw.split(TOKEN).join("[SEGREDO PROTEGIDO]") : raw;
}

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    cwd: REPO_ROOT,
    encoding: "utf8",
    stdio: options.silent ? ["ignore", "pipe", "pipe"] : ["ignore", "pipe", "inherit"],
  }).trim();
}

function normalizeSocialPath(candidate) {
  const normalized = candidate.trim().replaceAll("\\", "/").replace(/^\.\//, "");
  if (!/^blog\/[a-z0-9-]+\/social\.json$/.test(normalized)) {
    fail(`Arquivo social inválido: ${candidate}`);
  }

  const absolute = resolve(REPO_ROOT, normalized);
  if (!absolute.startsWith(`${resolve(REPO_ROOT)}${sep}`)) {
    fail("O arquivo social precisa estar dentro do repositório.");
  }
  return { relative: normalized, absolute };
}

function changedSocialFiles() {
  const manualFile = (process.env.SOCIAL_FILE || "").trim();
  if (manualFile) return [normalizeSocialPath(manualFile)];

  const after = (process.env.AFTER_SHA || process.env.GITHUB_SHA || "HEAD").trim();
  const before = (process.env.BEFORE_SHA || "").trim();
  let output = "";

  if (before && !/^0+$/.test(before)) {
    output = runGit(["diff", "--name-only", "--diff-filter=AM", before, after, "--", "blog"], { silent: true });
  } else {
    output = runGit(["show", "--pretty=format:", "--name-only", "--diff-filter=AM", after, "--", "blog"], { silent: true });
  }

  const uniqueFiles = [...new Set(output.split(/\r?\n/).filter((path) => path.endsWith("/social.json")))];
  return uniqueFiles.map(normalizeSocialPath);
}

function requireText(value, field, maxLength, minLength = 10) {
  if (typeof value !== "string" || value.trim().length < minLength) {
    fail(`Campo obrigatório inválido: ${field}`);
  }
  if (value.length > maxLength) {
    fail(`${field} ultrapassa o limite de ${maxLength} caracteres.`);
  }
  if (value.includes("\u2014")) {
    fail(`${field} contém um caractere de travessão não permitido.`);
  }
  return value.trim();
}

function validateMetadata(raw, sourceFile) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    fail(`JSON inválido em ${sourceFile}.`);
  }

  const slug = requireText(raw.slug, "slug", 100, 3);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fail("O slug deve conter apenas letras minúsculas, números e hífens.");
  }

  const title = requireText(raw.title, "title", 140);
  const articleUrl = new URL(requireText(raw.url, "url", 300));
  const siteOrigin = new URL(SITE_BASE_URL).origin;

  if (articleUrl.protocol !== "https:" || articleUrl.origin !== siteOrigin || articleUrl.pathname !== `/blog/${slug}/`) {
    fail("A URL do artigo não corresponde ao domínio e ao slug esperados.");
  }
  const imageCandidates = Array.isArray(raw.image_urls) && raw.image_urls.length
    ? raw.image_urls
    : [raw.image_url];
  if (imageCandidates.length > 10) fail("O carrossel pode ter no máximo 10 imagens.");
  const imageUrls = imageCandidates.map((candidate, index) => {
    const imageUrl = new URL(requireText(candidate, `image_urls[${index}]`, 300));
    if (imageUrl.protocol !== "https:" || imageUrl.origin !== siteOrigin || !/\.jpe?g$/i.test(imageUrl.pathname)) {
      fail("As imagens do Instagram precisam ser JPEGs públicos no domínio do site.");
    }
    return imageUrl.toString();
  });

  const publicationKey = typeof raw.publication_key === "string" && raw.publication_key.trim()
    ? raw.publication_key.trim()
    : slug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(publicationKey)) {
    fail("A chave de publicação deve conter apenas letras minúsculas, números e hífens.");
  }

  const facebookMessage = requireText(raw.facebook?.message, "facebook.message", 5000);
  const instagramCaption = requireText(raw.instagram?.caption, "instagram.caption", 2200);
  const hashtagCount = (instagramCaption.match(/#[\p{L}\p{N}_]+/gu) || []).length;
  if (hashtagCount > 5) {
    fail("A legenda do Instagram deve usar no máximo 5 hashtags relevantes.");
  }

  return {
    slug,
    publicationKey,
    title,
    url: articleUrl.toString(),
    imageUrl: imageUrls[0],
    imageUrls,
    facebookMessage,
    instagramCaption,
  };
}

async function waitForPublicUrl(url, expectedContentType) {
  const maxAttempts = 24;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": "BNC-Social-Publisher/1.0" },
      });
      const contentType = response.headers.get("content-type") || "";
      await response.body?.cancel();

      if (response.ok && contentType.toLowerCase().includes(expectedContentType)) {
        return;
      }
      console.log(`Aguardando publicação (${attempt}/${maxAttempts}): status ${response.status}`);
    } catch {
      console.log(`Aguardando publicação (${attempt}/${maxAttempts}): endereço ainda indisponível`);
    }

    if (attempt < maxAttempts) await sleep(15_000);
  }
  fail(`O endereço não ficou disponível a tempo: ${url}`);
}

async function metaRequest(path, { method = "GET", params = {}, token = TOKEN } = {}) {
  const url = new URL(`${GRAPH_BASE_URL}/${path.replace(/^\//, "")}`);
  const values = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) values.set(key, String(value));
  }
  values.set("access_token", token);

  const request = { method, headers: { Accept: "application/json" } };
  if (method === "GET") {
    url.search = values.toString();
  } else {
    request.headers["Content-Type"] = "application/x-www-form-urlencoded";
    request.body = values;
  }

  const response = await fetch(url, request);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.error) {
    const code = payload.error?.code ? ` (${payload.error.code})` : "";
    const message = payload.error?.message || `HTTP ${response.status}`;
    fail(`Erro da Meta${code}: ${message}`);
  }
  return payload;
}

async function discoverAssets() {
  let candidate = null;

  try {
    const ownedPages = await metaRequest(`${BUSINESS_ID}/owned_pages`, {
      params: {
        fields: "id,name,access_token,instagram_business_account,connected_instagram_account",
        limit: 100,
      },
    });
    candidate = (ownedPages.data || []).find((page) => page.id === EXPECTED_PAGE_ID)
      || (ownedPages.data || []).find((page) => page.name === "Beleza na Capital")
      || null;
  } catch (error) {
    console.log(`Consulta ao portfólio não disponível. Tentando a Página diretamente: ${safeError(error)}`);
  }

  const pageId = candidate?.id || EXPECTED_PAGE_ID;
  const details = await metaRequest(pageId, {
    params: { fields: "id,name,access_token,instagram_business_account,connected_instagram_account" },
  });
  const instagramId = details.instagram_business_account?.id
    || details.connected_instagram_account?.id
    || candidate?.instagram_business_account?.id
    || candidate?.connected_instagram_account?.id;

  if (!instagramId) {
    fail("A conta profissional do Instagram não foi encontrada na Página Beleza na Capital.");
  }

  return {
    pageId: details.id || pageId,
    pageName: details.name || candidate?.name || "Beleza na Capital",
    instagramId,
    pageToken: details.access_token || candidate?.access_token || TOKEN,
  };
}

function tagExists(tag) {
  try {
    runGit(["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`], { silent: true });
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.status === 2) return false;
    throw error;
  }
}

function markAsPublished(tag) {
  const commit = process.env.GITHUB_SHA || "HEAD";
  runGit(["tag", tag, commit]);
  runGit(["push", "origin", `refs/tags/${tag}`]);
}

async function publishFacebook(metadata, assets) {
  const tag = `social-facebook/${metadata.publicationKey}`;
  if (tagExists(tag)) {
    console.log(`Facebook já publicado para ${metadata.slug}.`);
    return;
  }

  let result;
  if (metadata.imageUrls.length > 1) {
    const attachedMedia = [];
    for (const imageUrl of metadata.imageUrls) {
      const photo = await metaRequest(`${assets.pageId}/photos`, {
        method: "POST",
        token: assets.pageToken,
        params: { url: imageUrl, published: false },
      });
      if (!photo.id) fail("A Meta não retornou o identificador de uma foto do carrossel do Facebook.");
      attachedMedia.push({ media_fbid: photo.id });
    }

    const params = { message: metadata.facebookMessage, published: true };
    attachedMedia.forEach((media, index) => {
      params[`attached_media[${index}]`] = JSON.stringify(media);
    });
    result = await metaRequest(`${assets.pageId}/feed`, {
      method: "POST",
      token: assets.pageToken,
      params,
    });
  } else {
    result = await metaRequest(`${assets.pageId}/feed`, {
      method: "POST",
      token: assets.pageToken,
      params: {
        message: metadata.facebookMessage,
        link: metadata.url,
        published: true,
      },
    });
  }
  if (!result.id) fail("A Meta não retornou o identificador da publicação no Facebook.");

  markAsPublished(tag);
  console.log(`Facebook publicado com sucesso. ID: ${result.id}`);
}

async function waitForInstagramContainer(containerId, token) {
  const maxAttempts = 30;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await metaRequest(containerId, {
      token,
      params: { fields: "status_code,status" },
    });
    if (status.status_code === "FINISHED") return;
    if (["ERROR", "EXPIRED"].includes(status.status_code)) {
      fail(`A preparação da mídia no Instagram falhou: ${status.status || status.status_code}`);
    }
    if (attempt < maxAttempts) await sleep(5_000);
  }
  fail("O Instagram não concluiu a preparação da mídia a tempo.");
}

async function publishInstagram(metadata, assets) {
  const tag = `social-instagram/${metadata.publicationKey}`;
  if (tagExists(tag)) {
    console.log(`Instagram já publicado para ${metadata.slug}.`);
    return;
  }

  let container;
  if (metadata.imageUrls.length > 1) {
    const children = [];
    for (const imageUrl of metadata.imageUrls) {
      const child = await metaRequest(`${assets.instagramId}/media`, {
        method: "POST",
        token: assets.pageToken,
        params: { image_url: imageUrl, is_carousel_item: true },
      });
      if (!child.id) fail("A Meta não retornou um item do carrossel do Instagram.");
      await waitForInstagramContainer(child.id, assets.pageToken);
      children.push(child.id);
    }
    container = await metaRequest(`${assets.instagramId}/media`, {
      method: "POST",
      token: assets.pageToken,
      params: {
        media_type: "CAROUSEL",
        children: children.join(","),
        caption: metadata.instagramCaption,
      },
    });
  } else {
    container = await metaRequest(`${assets.instagramId}/media`, {
      method: "POST",
      token: assets.pageToken,
      params: {
        image_url: metadata.imageUrl,
        caption: metadata.instagramCaption,
      },
    });
  }
  if (!container.id) fail("A Meta não retornou o contêiner de mídia do Instagram.");

  await waitForInstagramContainer(container.id, assets.pageToken);
  const result = await metaRequest(`${assets.instagramId}/media_publish`, {
    method: "POST",
    token: assets.pageToken,
    params: { creation_id: container.id },
  });
  if (!result.id) fail("A Meta não retornou o identificador da publicação no Instagram.");

  markAsPublished(tag);
  console.log(`Instagram publicado com sucesso. ID: ${result.id}`);
}

function selfTest() {
  const sample = {
    slug: "marketing-para-salao",
    title: "Marketing para salão de beleza",
    url: `${SITE_BASE_URL}/blog/marketing-para-salao/`,
    image_url: `${SITE_BASE_URL}/img/social-blog-bnc.jpg`,
    facebook: { message: "Conteúdo prático para melhorar o marketing do seu salão e gerar oportunidades com mais consistência." },
    instagram: { caption: "Conteúdo prático para melhorar o marketing do seu salão. Leia o artigo completo no Blog BNC. #MarketingParaSalao" },
  };
  validateMetadata(sample, "autoteste");
  console.log("Autoteste concluído com sucesso.");
}

async function main() {
  if (process.argv.includes("--self-test")) {
    selfTest();
    return;
  }
  if (!DRY_RUN && !TOKEN) {
    fail("O segredo META_SYSTEM_USER_TOKEN não está configurado.");
  }

  const files = changedSocialFiles();
  if (files.length === 0) {
    console.log("Nenhum arquivo social novo foi encontrado. Nada a publicar.");
    return;
  }

  for (const file of files) {
    const metadata = validateMetadata(JSON.parse(readFileSync(file.absolute, "utf8")), file.relative);
    console.log(`Artigo validado: ${metadata.title}`);

    if (DRY_RUN) {
      console.log(`Simulação concluída para ${metadata.slug}. Nenhuma rede social foi alterada.`);
      continue;
    }

    await waitForPublicUrl(metadata.url, "text/html");
    for (const imageUrl of metadata.imageUrls) {
      await waitForPublicUrl(imageUrl, "image/jpeg");
    }
    const assets = await discoverAssets();
    console.log(`Ativos conectados: ${assets.pageName} e Instagram profissional.`);

    await publishFacebook(metadata, assets);
    await publishInstagram(metadata, assets);
  }
}

main().catch((error) => {
  console.error(safeError(error));
  process.exitCode = 1;
});
