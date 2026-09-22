/**
 * BNC — Radar de Leads do Site
 * ---------------------------------------------------------------
 * Recebe os dados do formulário /diagnostico/ e grava na planilha
 * "BNC — Leads do Site (Radar)".
 *
 * Endpoints:
 *   POST  {type:'lead', ...}            -> grava uma linha nova
 *   POST  {type:'whatsapp_click', ...}  -> marca que o lead clicou no WhatsApp
 *   GET   ?token=...&action=pendentes   -> devolve os leads ainda não avisados
 *                                          e marca como avisados
 *   GET   ?token=...&action=pendentes&ack=0 -> só consulta, não marca
 *
 * Implantar: Implantar > Nova implantação > Tipo: App da Web
 *            Executar como: Eu | Quem pode acessar: Qualquer pessoa
 */

const SHEET_ID = '1HHPvrjGT4PwLzGE9aL294dcasMCpmg8gjfBzTC6_0ZY';
const SHEET_NAME = 'Leads';
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
