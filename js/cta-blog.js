/*
  Chamadas de conversao do blog.

  O radar mostrou que quase toda visita ao blog e de uma pagina so: a pessoa
  le o artigo e sai, sem nenhum caminho claro para falar com a BNC. Este
  arquivo coloca, em todo artigo:

    1. uma chamada no meio do texto, ligada ao assunto do artigo;
    2. uma chamada no fim do texto;
    3. o botao flutuante de WhatsApp.

  A mensagem pronta do WhatsApp leva o titulo do artigo, entao a equipe sabe
  de onde a pessoa veio. Os cliques entram no radar como wa_click, com a secao
  "blog-cta-meio", "blog-cta-fim" ou "blog-flutuante".

  Todo artigo novo precisa carregar: <script src="/js/cta-blog.js" defer></script>
*/
(function () {
  'use strict';

  var NUMERO = '5561995055390';
  var CONVERSAO = 'AW-18156422201/R5uZCI3vyqscELmI1NFD';

  var corpo = document.querySelector('.article-body');
  var ehArtigo = !!corpo;
  var path = window.location.pathname;

  // Assuntos com chamada propria. A primeira regra que bater com o endereco
  // do artigo vale; o resto cai na chamada geral.
  var ASSUNTOS = [
    {
      teste: /avaliac|review/,
      titulo: 'Quer essas mensagens prontas para o seu salão?',
      texto: 'A BNC adapta os modelos ao seu salão e organiza a rotina de pedir avaliação no Google. Fale com a equipe pelo WhatsApp.',
      botao: 'Quero as mensagens adaptadas',
      pedido: 'quero ajuda para adaptar as mensagens de avaliação ao meu salão'
    },
    {
      teste: /meta-ads|google-ads|anuncio|trafego|campanha|segmentacao|custo-por/,
      titulo: 'Anúncio que vira agendamento, não só clique.',
      texto: 'A BNC olha o seu investimento atual e diz onde está o desperdício e o que ajustar primeiro.',
      botao: 'Quero revisar meus anúncios',
      pedido: 'quero entender se meus anúncios estão trazendo agendamento'
    },
    {
      teste: /google-meu-negocio|perfil-empresa|google-maps|maps|seo|google/,
      titulo: 'Seu salão aparece no Google quando procuram por você?',
      texto: 'A BNC analisa o Perfil da Empresa e as buscas da sua região e mostra o que está impedindo o salão de aparecer.',
      botao: 'Quero uma análise do meu Google',
      pedido: 'quero uma análise de como meu salão aparece no Google'
    },
    {
      teste: /whatsapp|follow-up|resposta|recepc|atendimento|agendamento|atrasad|no-show|falta/,
      titulo: 'O WhatsApp do salão está perdendo cliente?',
      texto: 'A BNC organiza resposta, follow-up e confirmação para que o contato vire agendamento. Converse com a equipe.',
      botao: 'Quero organizar meu atendimento',
      pedido: 'quero organizar o atendimento do WhatsApp do meu salão'
    },
    {
      teste: /margem|ponto-de-equilibrio|dre|fluxo-de-caixa|precific|lucrativ|financeir|orcamento|indicador/,
      titulo: 'Os números do seu salão fecham?',
      texto: 'Na consultoria BNC olhamos margem, preço e metas com você e montamos o plano de crescimento.',
      botao: 'Quero olhar meus números',
      pedido: 'quero ajuda para organizar os números do meu salão'
    },
    {
      teste: /fideliz|recorren|indicac|retorno|pos-atendimento/,
      titulo: 'Quer que a cliente volte sem precisar pedir?',
      texto: 'A BNC monta a rotina de retorno e indicação do seu salão. Fale com a equipe pelo WhatsApp.',
      botao: 'Quero mais clientes voltando',
      pedido: 'quero aumentar o retorno das clientes do meu salão'
    }
  ];

  var GERAL = {
    titulo: 'Quer aplicar isso no seu salão?',
    texto: 'A equipe da BNC olha o seu caso e te diz por onde começar. Conversa rápida pelo WhatsApp, sem compromisso.',
    botao: 'Falar com a BNC no WhatsApp',
    pedido: 'quero ajuda para aplicar isso no meu salão'
  };

  function assunto() {
    for (var i = 0; i < ASSUNTOS.length; i++) {
      if (ASSUNTOS[i].teste.test(path)) return ASSUNTOS[i];
    }
    return GERAL;
  }

  function tituloDoArtigo() {
    var h1 = document.querySelector('h1');
    return h1 ? h1.textContent.trim().replace(/\s+/g, ' ') : document.title;
  }

  function linkWhatsApp(pedido) {
    var texto = ehArtigo
      ? 'Olá! Li o artigo "' + tituloDoArtigo() + '" no site da BNC e ' + pedido + '.'
      : 'Olá! Vim pelo blog da BNC e ' + pedido + '.';
    return 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(texto);
  }

  function registrarConversao() {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', { send_to: CONVERSAO, transport_type: 'beacon' });
      }
    } catch (e) { /* nunca travar o clique */ }
  }

  var ICONE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="20" height="20">' +
    '<path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>' +
    '<path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.554 4.118 1.524 5.847L.057 23.457a.5.5 0 0 0 .614.614l5.61-1.467A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.369l-.358-.213-3.728.976.996-3.636-.234-.374A9.782 9.782 0 0 1 2.182 12c0-5.42 4.398-9.818 9.818-9.818 5.42 0 9.818 4.398 9.818 9.818 0 5.42-4.398 9.818-9.818 9.818z"/></svg>';

  function caixa(secao, conteudo) {
    var box = document.createElement('aside');
    box.className = 'blog-cta';
    box.setAttribute('data-secao', secao);
    box.setAttribute('aria-label', 'Fale com a Beleza na Capital');
    box.innerHTML =
      '<p class="blog-cta-kicker">Beleza na Capital</p>' +
      '<p class="blog-cta-title">' + conteudo.titulo + '</p>' +
      '<p class="blog-cta-text">' + conteudo.texto + '</p>' +
      '<div class="blog-cta-actions">' +
        '<a class="btn btn-primary blog-cta-wa" target="_blank" rel="noopener noreferrer" href="' +
          linkWhatsApp(conteudo.pedido) + '">' + ICONE + '<span>' + conteudo.botao + '</span></a>' +
        '<a class="blog-cta-link" href="/diagnostico/">Ou faça o diagnóstico gratuito</a>' +
      '</div>';
    box.querySelector('.blog-cta-wa').addEventListener('click', registrarConversao);
    return box;
  }

  function inserirChamadas() {
    if (!ehArtigo || corpo.querySelector('.blog-cta')) return;
    var conteudo = assunto();
    var titulos = corpo.querySelectorAll('h2');
    // meio do texto: antes do subtitulo central, assim a pessoa ja leu o
    // suficiente para confiar e ainda nao foi embora
    if (titulos.length >= 3) {
      var meio = titulos[Math.floor(titulos.length / 2)];
      meio.parentNode.insertBefore(caixa('blog-cta-meio', conteudo), meio);
    }
    corpo.appendChild(caixa('blog-cta-fim', conteudo));
  }

  function inserirFlutuante() {
    if (document.querySelector('.wa-float')) return;
    var a = document.createElement('a');
    a.className = 'wa-float';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.href = linkWhatsApp(assunto().pedido);
    a.setAttribute('aria-label', 'Falar com a BNC no WhatsApp');
    a.setAttribute('data-secao', 'blog-flutuante');
    a.innerHTML = ICONE.replace('width="20" height="20"', 'width="28" height="28"');
    a.addEventListener('click', registrarConversao);
    document.body.appendChild(a);
  }

  function iniciar() {
    try { inserirChamadas(); } catch (e) { /* pagina segue normal */ }
    try { inserirFlutuante(); } catch (e) { /* pagina segue normal */ }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar);
  } else {
    iniciar();
  }
})();
