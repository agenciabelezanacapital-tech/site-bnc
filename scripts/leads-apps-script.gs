/**
 * BNC — Radar de Leads do Site
 * ---------------------------------------------------------------
 * Recebe os dados do formulário /diagnostico/ e grava na planilha
 * "BNC — Leads do Site (Radar)".
 *
 * Endpoints:
 *   POST  {type:'lead', ...}            -> grava uma linha nova na aba Leads
 *   POST  {type:'whatsapp_click', ...}  -> marca que o lead clicou no WhatsApp
 *   POST  {type:'pageview'|'step'|'abandon'|'wa_click'|'exit', ...}
 *                                       -> grava uma linha na aba Funil
 *   GET   ?token=...&action=funil       -> devolve os eventos do funil
 *   GET   ?token=...&action=funil&dias=7 -> so os ultimos N dias
 *   GET   ?token=...&action=pendentes   -> devolve os leads ainda não avisados
 *                                          e marca como avisados
 *   GET   ?token=...&action=pendentes&ack=0 -> só consulta, não marca
 *
 * Implantar: Implantar > Nova implantação > Tipo: App da Web
 *            Executar como: Eu | Quem pode acessar: Qualquer pessoa
 */

const SHEET_ID = '1HHPvrjGT4PwLzGE9aL294dcasMCpmg8gjfBzTC6_0ZY';
const SHEET_NAME = 'Leads';
const SHEET_FUNIL = 'Funil';
const TOKEN = 'bnc-radar-7fK3nQ2026';
const TZ = 'America/Sao_Paulo';

const HEADERS = [
  'Data/Hora', 'Lead ID', 'Status', 'Classificação', 'Score',
  'Nome', 'Negócio', 'WhatsApp', 'E-mail', 'Tipo de negócio',
  'País', 'Cidade', 'Estado/Região', 'Faturamento', 'Tempo de operação',
  'Equipe', 'Função no negócio', 'Quem atende contatos', 'Principal desafio',
  'Prazo', 'Interesse', 'Investimento atual', 'Idioma', 'Origem',
  'Clicou no WhatsApp', 'Avisado no Claude'
];

const COL = {};
HEADERS.forEach(function (h, i) { COL[h] = i + 1; });

// Aba Funil: um evento por linha. E a materia-prima do dashboard do site.
const HEADERS_FUNIL = [
  'Data/Hora', 'Visita ID', 'Evento', 'Pagina', 'Titulo',
  'Etapa', 'Nome da Etapa', 'Campo travado', 'Secao', 'Texto do botao',
  'Numero', 'Posicao na pagina', 'Rolagem', 'Texto pre-preenchido',
  'Segundos', 'Dispositivo', 'Idioma', 'Referrer', 'URL'
];

const COLF = {};
HEADERS_FUNIL.forEach(function (h, i) { COLF[h] = i + 1; });

const TIPOS_FUNIL = ['pageview', 'step', 'abandon', 'wa_click', 'exit'];

function sheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    const primeira = ss.getSheets()[0];
    if (primeira.getName() !== SHEET_NAME && primeira.getLastRow() === 0) {
      ss.deleteSheet(primeira);
    }
  }
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sh.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0D0D0D')
      .setFontColor('#C9A96E');
    sh.setFrozenRows(1);
    sh.setColumnWidth(COL['Data/Hora'], 150);
    sh.setColumnWidth(COL['Lead ID'], 130);
    sh.setColumnWidth(COL['Nome'], 180);
    sh.setColumnWidth(COL['Negócio'], 200);
    sh.setColumnWidth(COL['WhatsApp'], 150);
  }
  return sh;
}

function sheetFunil_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(SHEET_FUNIL);
  if (!sh) sh = ss.insertSheet(SHEET_FUNIL);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, HEADERS_FUNIL.length).setValues([HEADERS_FUNIL]);
    sh.getRange(1, 1, 1, HEADERS_FUNIL.length)
      .setFontWeight('bold')
      .setBackground('#0D0D0D')
      .setFontColor('#C9A96E');
    sh.setFrozenRows(1);
    sh.setColumnWidth(COLF['Data/Hora'], 150);
    sh.setColumnWidth(COLF['Visita ID'], 130);
    sh.setColumnWidth(COLF['Pagina'], 240);
    sh.setColumnWidth(COLF['Texto pre-preenchido'], 280);
  }
  return sh;
}

function agora_() {
  return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss');
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.token !== TOKEN) return json_({ ok: false, erro: 'token' });

    const sh = sheet_();

    if (TIPOS_FUNIL.indexOf(body.type) > -1) {
      const shf = sheetFunil_();
      shf.appendRow([
        agora_(),
        body.visitaId || '',
        body.type,
        body.pagina || '',
        body.titulo || '',
        body.etapa || '',
        body.etapaNome || '',
        body.campoTravado || '',
        body.secao || '',
        body.textoBotao || '',
        body.numero || '',
        body.posicao || '',
        body.rolagem || '',
        body.prefill || '',
        body.segundos || '',
        body.dispositivo || '',
        body.idioma || '',
        body.referrer || '',
        body.url || ''
      ]);
      return json_({ ok: true, aba: SHEET_FUNIL });
    }

    if (body.type === 'whatsapp_click') {
      const ids = sh.getRange(2, COL['Lead ID'], Math.max(sh.getLastRow() - 1, 1), 1).getValues();
      for (let i = ids.length - 1; i >= 0; i--) {
        if (String(ids[i][0]) === String(body.leadId)) {
          const linha = i + 2;
          sh.getRange(linha, COL['Clicou no WhatsApp']).setValue(agora_());
          sh.getRange(linha, COL['Status']).setValue('Chamou no WhatsApp');
          break;
        }
      }
      return json_({ ok: true });
    }

    const c = body.campos || {};
    sh.appendRow([
      agora_(),
      body.leadId || '',
      'Novo',
      'Lead ' + (body.tier || ''),
      body.score || '',
      c.nome || '',
      c.negocio || '',
      c.whatsapp || '',
      c.email || '',
      c.tipoNegocio || '',
      c.pais || '',
      c.cidade || '',
      c.regiao || '',
      c.faturamento || '',
      c.tempoOperacao || '',
      c.equipe || '',
      c.funcao || '',
      c.quemAtende || '',
      c.desafio || '',
      c.prazo || '',
      c.interesse || '',
      c.investimento || '',
      c.idioma || '',
      body.origem || '',
      '',
      ''
    ]);

    return json_({ ok: true });
  } catch (erro) {
    return json_({ ok: false, erro: String(erro) });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.token !== TOKEN) return json_({ ok: false, erro: 'token' });

  if (p.action === 'funil') {
    const shf = sheetFunil_();
    const fim = shf.getLastRow();
    if (fim < 2) return json_({ ok: true, total: 0, eventos: [] });
    const brutos = shf.getRange(2, 1, fim - 1, HEADERS_FUNIL.length).getValues();
    const dias = parseInt(p.dias, 10);
    const limite = dias > 0 ? new Date(Date.now() - dias * 86400000) : null;
    const eventos = [];
    brutos.forEach(function (linha) {
      if (limite) {
        // Data/Hora e gravada como dd/MM/yyyy HH:mm:ss
        const partes = String(linha[0]).match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
        if (partes) {
          const d = new Date(+partes[3], +partes[2] - 1, +partes[1], +partes[4], +partes[5], +partes[6]);
          if (d < limite) return;
        }
      }
      const ev = {};
      HEADERS_FUNIL.forEach(function (h, j) { ev[h] = linha[j]; });
      eventos.push(ev);
    });
    return json_({ ok: true, total: eventos.length, eventos: eventos });
  }

  const sh = sheet_();
  const ultima = sh.getLastRow();
  if (ultima < 2) return json_({ ok: true, total: 0, leads: [] });

  const dados = sh.getRange(2, 1, ultima - 1, HEADERS.length).getValues();
  const marcar = p.ack !== '0';
  const leads = [];

  dados.forEach(function (linha, i) {
    const jaAvisado = String(linha[COL['Avisado no Claude'] - 1] || '').trim();
    if (p.action === 'pendentes' && jaAvisado) return;
    const lead = {};
    HEADERS.forEach(function (h, j) { lead[h] = linha[j]; });
    lead._linha = i + 2;
    leads.push(lead);
    if (p.action === 'pendentes' && marcar) {
      sh.getRange(i + 2, COL['Avisado no Claude']).setValue(agora_());
    }
  });

  return json_({ ok: true, total: leads.length, leads: leads });
}
