/* ---------------------------------------------------------------
   BNC — Radar do Site
   ---------------------------------------------------------------
   Arquivo unico que carrega em TODAS as paginas do site.
   Responsabilidades:
     1. Guardar a URL do Apps Script em UM lugar so (LEAD_ENDPOINT).
     2. Registrar cada visita de pagina (type:'pageview').
     3. Registrar cada clique em botao de WhatsApp (type:'wa_click'),
        dizendo de qual pagina, de qual secao e de qual botao veio.
     3b. Registrar todo clique da pagina (type:'click') com a posicao em
        porcentagem, que e a materia-prima do mapa de calor proprio.
     4. Expor window.BNCRadar para o diagnostico.js usar o mesmo cano.

   Se LEAD_ENDPOINT nao for uma URL http valida, tudo aqui fica inerte:
   o radar nunca pode travar a navegacao nem o clique do lead.
--------------------------------------------------------------- */
(function () {
  'use strict';

  // >>> UNICO lugar do site onde a URL do Apps Script precisa ser colada <<<
  var LEAD_ENDPOINT = 'https://script.google.com/macros/s/AKfycbwouEL3eGpbsJMefXOaKtw33LaGR3DWY9oukUoA59PgwBaRkvVpKhpGlRf_2KUUJ290/exec';
  var LEAD_TOKEN = 'bnc-radar-7fK3nQ2026';

  var ativo = typeof LEAD_ENDPOINT === 'string' && LEAD_ENDPOINT.indexOf('http') === 0;
  var inicio = Date.now();

  function gerarId() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    var carimbo = '' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      '-' + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
    return carimbo + '-' + Math.random().toString(36).slice(2, 7);
  }

  // A visita dura a sessao do navegador: assim o funil consegue ligar
  // "entrou no blog" com "clicou no WhatsApp da home" como uma pessoa so.
  function visitaId() {
    var chave = 'bnc_visita';
    try {
      var v = sessionStorage.getItem(chave);
      if (!v) { v = gerarId(); sessionStorage.setItem(chave, v); }
      return v;
    } catch (e) {
      return gerarId();
    }
  }

  function dispositivo() {
    var l = (navigator.userAgent || '').toLowerCase();
    if (/ipad|tablet/.test(l)) return 'tablet';
    if (/mobi|android|iphone/.test(l)) return 'celular';
    return 'desktop';
  }

  function segundos() {
    return Math.round((Date.now() - inicio) / 1000);
  }

  function enviar(payload, usarBeacon) {
    if (!ativo) return;
    var corpo;
    try {
      corpo = JSON.stringify(Object.assign({ token: LEAD_TOKEN }, payload));
    } catch (e) {
      return;
    }
    try {
      if (usarBeacon && navigator.sendBeacon) {
        navigator.sendBeacon(LEAD_ENDPOINT, new Blob([corpo], { type: 'text/plain;charset=UTF-8' }));
        return;
      }
      fetch(LEAD_ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: corpo
      }).catch(function () {});
    } catch (e) {
      // silencio proposital
    }
  }

  // Descobre em que parte da pagina o botao esta, sem precisar marcar
  // nada no HTML: usa o id da secao mais proxima ou o titulo acima dela.
  function secaoDoElemento(el) {
    var no = el;
    while (no && no !== document.body) {
      if (no.id) return no.id;
      if (no.getAttribute && no.getAttribute('data-secao')) return no.getAttribute('data-secao');
      no = no.parentElement;
    }
    var titulo = null;
    no = el;
    while (no && no !== document.body && !titulo) {
      var anterior = no.previousElementSibling;
      while (anterior && !titulo) {
        if (/^H[1-4]$/.test(anterior.tagName)) titulo = anterior;
        else titulo = anterior.querySelector ? anterior.querySelector('h1,h2,h3') : null;
        anterior = anterior.previousElementSibling;
      }
      no = no.parentElement;
    }
    return titulo ? titulo.textContent.trim().slice(0, 60) : 'sem-secao';
  }

  function posicaoNaPagina(el) {
    try {
      var topo = el.getBoundingClientRect().top + window.scrollY;
      var altura = document.documentElement.scrollHeight || 1;
      return Math.round((topo / altura) * 100) + '%';
    } catch (e) {
      return '';
    }
  }

  function contexto() {
    return {
      visitaId: visitaId(),
      pagina: window.location.pathname,
      url: window.location.href,
      titulo: document.title,
      referrer: document.referrer || '',
      dispositivo: dispositivo(),
      idioma: document.documentElement.lang || '',
      segundos: segundos()
    };
  }

  // ---------- 1) visita de pagina ----------
  enviar(Object.assign({ type: 'pageview' }, contexto()), false);

  // ---------- 2) profundidade de rolagem ----------
  // Marca 25/50/75/100 por cento uma vez cada. E o dado que diz se a pessoa
  // chegou a ver o bloco do diagnostico ou saiu no primeiro scroll.
  var marcos = { 25: false, 50: false, 75: false, 100: false };
  var maiorRolagem = 0;
  window.addEventListener('scroll', function () {
    var altura = document.documentElement.scrollHeight - window.innerHeight;
    if (altura <= 0) return;
    var pct = Math.round((window.scrollY / altura) * 100);
    if (pct > maiorRolagem) maiorRolagem = Math.min(pct, 100);
    [25, 50, 75, 100].forEach(function (m) {
      if (!marcos[m] && maiorRolagem >= m) {
        marcos[m] = true;
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'scroll_depth', { percent: m, page_path: window.location.pathname });
        }
      }
    });
  }, { passive: true });

  // ---------- 3) clique em qualquer botao de WhatsApp ----------
  document.addEventListener('click', function (evento) {
    var link = evento.target && evento.target.closest ? evento.target.closest('a[href*="wa.me"]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    var prefill = '';
    var corte = href.indexOf('text=');
    if (corte > -1) {
      try { prefill = decodeURIComponent(href.slice(corte + 5).replace(/\+/g, ' ')); } catch (e) { prefill = ''; }
    }
    var numero = (href.match(/wa\.me\/(\d+)/) || [])[1] || '';
    enviar(Object.assign({
      type: 'wa_click',
      numero: numero,
      secao: secaoDoElemento(link),
      textoBotao: (link.textContent || '').trim().slice(0, 60),
      posicao: posicaoNaPagina(link),
      rolagem: maiorRolagem + '%',
      prefill: prefill.slice(0, 160)
    }, contexto()), true);
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'whatsapp_click', {
        page_path: window.location.pathname,
        section: secaoDoElemento(link),
        button_text: (link.textContent || '').trim().slice(0, 60)
      });
    }
  }, true);

  // ---------- 3b) mapa de clique ----------
  // Registra qualquer clique na pagina, nao so o botao de WhatsApp.
  // Guarda a posicao em porcentagem da largura e da altura TOTAIS da pagina,
  // para o painel conseguir desenhar o mapa em qualquer tamanho de tela.
  // Teto por visita para nao inundar a planilha.
  var cliquesEnviados = 0;
  var TETO_CLIQUES = 40;

  function alvoClicavel(el) {
    if (!el || !el.closest) return el;
    return el.closest('a,button,input,select,textarea,label,[role="button"],[onclick]') || el;
  }

  function nomeDoAlvo(el) {
    if (!el) return '';
    var texto = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (texto) return texto.slice(0, 60);
    var alt = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title'));
    if (alt) return String(alt).trim().slice(0, 60);
    return '<' + (el.tagName || '?').toLowerCase() + '>';
  }

  document.addEventListener('click', function (evento) {
    if (cliquesEnviados >= TETO_CLIQUES) return;
    var alvo = evento.target;
    if (!alvo || alvo.nodeType !== 1) return;
    // o botao de WhatsApp ja tem evento proprio; nao contar duas vezes
    if (alvo.closest && alvo.closest('a[href*="wa.me"]')) return;
    cliquesEnviados++;

    var x = '', y = '';
    try {
      var largura = document.documentElement.scrollWidth || window.innerWidth || 1;
      var altura = document.documentElement.scrollHeight || 1;
      x = Math.round(((evento.pageX || 0) / largura) * 1000) / 10;
      y = Math.round(((evento.pageY || 0) / altura) * 1000) / 10;
    } catch (e) {}

    enviar(Object.assign({
      type: 'click',
      secao: secaoDoElemento(alvo),
      textoBotao: nomeDoAlvo(alvoClicavel(alvo)),
      posicao: x + ',' + y,
      numero: window.innerWidth || '',
      rolagem: maiorRolagem + '%'
    }, contexto()), true);
  }, true);

  // ---------- 4) saida da pagina ----------
  var saidaEnviada = false;
  function registrarSaida() {
    if (saidaEnviada) return;
    saidaEnviada = true;
    enviar(Object.assign({ type: 'exit', rolagem: maiorRolagem + '%' }, contexto()), true);
  }
  window.addEventListener('pagehide', registrarSaida);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') registrarSaida();
  });

  // ---------- 5) cano compartilhado para o diagnostico.js ----------
  window.BNCRadar = {
    endpoint: LEAD_ENDPOINT,
    token: LEAD_TOKEN,
    ativo: ativo,
    enviar: enviar,
    visitaId: visitaId,
    dispositivo: dispositivo
  };
})();
