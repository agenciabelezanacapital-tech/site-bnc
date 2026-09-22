(function () {
  'use strict';

  const form = document.querySelector('#qualification-form');
  if (!form) return;

  const steps = Array.from(form.querySelectorAll('.form-step'));
  const progressBar = document.querySelector('#progress-bar');
  const progressLabel = document.querySelector('#progress-label');
  const backButton = document.querySelector('#back-button');
  const nextButton = document.querySelector('#next-button');
  const submitButton = document.querySelector('#submit-button');
  const errorBox = document.querySelector('#form-error');
  const country = document.querySelector('#country');
  const language = document.querySelector('#language');
  const revenue = document.querySelector('#revenue');
  const interest = document.querySelector('#interest');
  const result = document.querySelector('#qualification-result');
  let currentStep = 0;

  const SUPPORTED_LANGS = ['pt', 'en', 'es'];

  // ---------------------------------------------------------------
  // Radar de leads BNC — grava o lead antes de abrir o WhatsApp.
  // A URL vem do web app do Apps Script (scripts/leads-apps-script.gs).
  // ---------------------------------------------------------------
  const LEAD_ENDPOINT = 'COLE_AQUI_A_URL_DO_APPS_SCRIPT';
  const LEAD_TOKEN = 'bnc-radar-7fK3nQ2026';
  let leadId = '';

  function gerarLeadId() {
    const d = new Date();
    const p = n => String(n).padStart(2, '0');
    const carimbo = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
    return `${carimbo}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function enviarParaRadar(payload, usarBeacon) {
    if (typeof LEAD_ENDPOINT !== 'string' || LEAD_ENDPOINT.indexOf('http') !== 0) return;
    const corpo = JSON.stringify(Object.assign({ token: LEAD_TOKEN }, payload));
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
      }).catch(() => {});
    } catch (erro) {
      // o radar nunca pode travar o fluxo do lead
    }
  }

  function montarCamposDoRadar(data) {
    const textoSelecionado = id => {
      const select = document.querySelector(`#${id}`);
      return select?.options[select.selectedIndex]?.text || '';
    };
    return {
      nome: data.name || '',
      negocio: data.businessName || '',
      whatsapp: data.phone || '',
      email: data.email || '',
      tipoNegocio: textoSelecionado('business-type') || data.businessType || '',
      pais: textoSelecionado('country') || data.country || '',
      cidade: data.city || '',
      regiao: data.region || '',
      faturamento: textoSelecionado('revenue') || data.revenue || '',
      tempoOperacao: textoSelecionado('operation-time') || data.operationTime || '',
      equipe: textoSelecionado('team-size') || data.teamSize || '',
      funcao: textoSelecionado('decision-role') || data.decisionRole || '',
      quemAtende: textoSelecionado('lead-owner') || data.leadOwner || '',
      desafio: textoSelecionado('challenge') || data.challenge || '',
      prazo: textoSelecionado('timeline') || data.timeline || '',
      interesse: textoSelecionado('interest') || data.interest || '',
      investimento: data.marketingInvestment || '',
      idioma: data.language || ''
    };
  }

  function uiLang() {
    const value = language?.value;
    return SUPPORTED_LANGS.includes(value) ? value : 'pt';
  }

  // t(português, inglês, espanhol) — escolhe o texto pelo idioma da interface
  function t(pt, en, es) {
    const current = uiLang();
    if (current === 'en') return en;
    if (current === 'es') return es;
    return pt;
  }

  // tl() usa o idioma vindo do formulário enviado, não o estado atual do select
  function tl(value, pt, en, es) {
    if (value === 'en') return en;
    if (value === 'es') return es;
    return pt;
  }

  function isEnglish() {
    return uiLang() === 'en';
  }

  const revenueValues = {
    br: ['', 'br-under-30', 'br-30-40', 'br-40-70', 'br-70-100', 'br-100-200', 'br-over-200'],
    us: ['', 'us-under-5', 'us-5-8', 'us-8-15', 'us-15-25', 'us-25-50', 'us-over-50'],
    other: ['', 'other-under-8', 'other-8-15', 'other-15-25', 'other-over-25']
  };

  const revenueLabels = {
    pt: {
      '': 'Selecione',
      'br-under-30': 'Até R$ 30 mil',
      'br-30-40': 'R$ 30 mil a R$ 40 mil',
      'br-40-70': 'R$ 40 mil a R$ 70 mil',
      'br-70-100': 'R$ 70 mil a R$ 100 mil',
      'br-100-200': 'R$ 100 mil a R$ 200 mil',
      'br-over-200': 'Acima de R$ 200 mil',
      'us-under-5': 'Até US$ 5 mil',
      'us-5-8': 'US$ 5 mil a US$ 8 mil',
      'us-8-15': 'US$ 8 mil a US$ 15 mil',
      'us-15-25': 'US$ 15 mil a US$ 25 mil',
      'us-25-50': 'US$ 25 mil a US$ 50 mil',
      'us-over-50': 'Acima de US$ 50 mil',
      'other-under-8': 'Equivalente a menos de US$ 8 mil',
      'other-8-15': 'Equivalente a US$ 8 mil a US$ 15 mil',
      'other-15-25': 'Equivalente a US$ 15 mil a US$ 25 mil',
      'other-over-25': 'Equivalente a mais de US$ 25 mil'
    },
    en: {
      '': 'Select',
      'br-under-30': 'Up to R$30,000',
      'br-30-40': 'R$30,000 to R$40,000',
      'br-40-70': 'R$40,000 to R$70,000',
      'br-70-100': 'R$70,000 to R$100,000',
      'br-100-200': 'R$100,000 to R$200,000',
      'br-over-200': 'Over R$200,000',
      'us-under-5': 'Up to $5,000',
      'us-5-8': '$5,000 to $8,000',
      'us-8-15': '$8,000 to $15,000',
      'us-15-25': '$15,000 to $25,000',
      'us-25-50': '$25,000 to $50,000',
      'us-over-50': 'Over $50,000',
      'other-under-8': 'Equivalent to less than $8,000',
      'other-8-15': 'Equivalent to $8,000 to $15,000',
      'other-15-25': 'Equivalent to $15,000 to $25,000',
      'other-over-25': 'Equivalent to more than $25,000'
    },
    es: {
      '': 'Selecciona',
      'br-under-30': 'Hasta R$ 30 mil',
      'br-30-40': 'R$ 30 mil a R$ 40 mil',
      'br-40-70': 'R$ 40 mil a R$ 70 mil',
      'br-70-100': 'R$ 70 mil a R$ 100 mil',
      'br-100-200': 'R$ 100 mil a R$ 200 mil',
      'br-over-200': 'Más de R$ 200 mil',
      'us-under-5': 'Hasta US$ 5 mil',
      'us-5-8': 'US$ 5 mil a US$ 8 mil',
      'us-8-15': 'US$ 8 mil a US$ 15 mil',
      'us-15-25': 'US$ 15 mil a US$ 25 mil',
      'us-25-50': 'US$ 25 mil a US$ 50 mil',
      'us-over-50': 'Más de US$ 50 mil',
      'other-under-8': 'Equivalente a menos de US$ 8 mil',
      'other-8-15': 'Equivalente a US$ 8 mil a US$ 15 mil',
      'other-15-25': 'Equivalente a US$ 15 mil a US$ 25 mil',
      'other-over-25': 'Equivalente a más de US$ 25 mil'
    }
  };

  function updateRevenueOptions() {
    const values = revenueValues[country.value];
    const labels = revenueLabels[uiLang()] || revenueLabels.pt;
    revenue.innerHTML = '';
    if (!values) {
      revenue.disabled = true;
      revenue.add(new Option(t('Selecione primeiro o país', 'Select a country first', 'Selecciona primero el país'), ''));
      return;
    }
    values.forEach(value => revenue.add(new Option(labels[value] || value, value)));
    revenue.disabled = false;
  }

  function showStep(index) {
    // nunca sair da faixa de etapas: um indice invalido derrubava o
    // formulario inteiro ("Etapa 5 de 4") e o lead ficava sem conseguir enviar
    if (!steps.length) return;
    index = Math.max(0, Math.min(index, steps.length - 1));
    currentStep = index;
    steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));
    progressBar.style.width = `${((index + 1) / steps.length) * 100}%`;
    const labels = t(
      ['Mercado', 'Operação', 'Objetivo', 'Contato'],
      ['Market', 'Business', 'Goals', 'Contact'],
      ['Mercado', 'Operación', 'Objetivo', 'Contacto']
    );
    progressLabel.textContent = t(
      `Etapa ${index + 1} de ${steps.length} · ${labels[index]}`,
      `Step ${index + 1} of ${steps.length} · ${labels[index]}`,
      `Paso ${index + 1} de ${steps.length} · ${labels[index]}`
    );
    backButton.hidden = index === 0;
    nextButton.hidden = index === steps.length - 1;
    submitButton.hidden = index !== steps.length - 1;
    errorBox.textContent = '';
    steps[index]?.querySelector('h2')?.focus?.();
  }

  function validateCurrentStep() {
    const requiredFields = Array.from(steps[currentStep].querySelectorAll('[required]'));
    const invalid = requiredFields.find(field => !field.checkValidity());
    if (!invalid) return true;
    errorBox.textContent = invalid.type === 'checkbox'
      ? t('Você precisa autorizar o contato para continuar.', 'You must authorize contact to continue.', 'Necesitas autorizar el contacto para continuar.')
      : t('Preencha todos os campos obrigatórios desta etapa.', 'Complete all required fields in this step.', 'Completa todos los campos obligatorios de este paso.');
    invalid.focus();
    return false;
  }

  function revenueScore(value) {
    if (/over-200|over-50|over-25/.test(value)) return 30;
    if (/100-200|25-50/.test(value)) return 28;
    if (/70-100|15-25/.test(value)) return 24;
    if (/40-70|8-15/.test(value)) return 14;
    if (/30-40|5-8/.test(value)) return 7;
    return 2;
  }

  function calculateScore(data) {
    let score = revenueScore(data.revenue);
    score += data.teamSize === '10+' ? 15 : data.teamSize === '5-10' ? 13 : data.teamSize === '2-4' ? 9 : 3;
    score += data.leadOwner === 'reception' || data.leadOwner === 'sales' ? 15 : data.leadOwner === 'owner' ? 9 : 2;
    score += data.decisionRole === 'owner' ? 10 : data.decisionRole === 'decision' ? 8 : 2;
    score += data.timeline === 'now' ? 15 : data.timeline === '30' ? 13 : data.timeline === '60' ? 9 : data.timeline === 'later' ? 5 : 2;
    score += data.challenge === 'Ainda não sei' ? 5 : 10;
    score += ['Salão de beleza', 'Barbearia', 'Clínica de estética'].includes(data.businessType) ? 5 : 3;
    return Math.min(score, 100);
  }

  function classify(score, data) {
    const isRecurringFit = /br-70-100|br-100-200|br-over-200|us-15-25|us-25-50|us-over-50|other-15-25|other-over-25/.test(data.revenue);
    const lang = data.language;
    if (score >= 80 && isRecurringFit) {
      return {
        tier: 'A',
        title: tl(lang,
          'Seu negócio tem forte aderência ao Método BNC.',
          'Your business is a strong fit for the BNC Method.',
          'Tu negocio tiene una fuerte afinidad con el Método BNC.'),
        copy: tl(lang,
          'A estrutura informada indica potencial para uma conversa comercial prioritária. Nossa equipe vai validar metas, capacidade de atendimento e o formato de acompanhamento.',
          'Your answers indicate potential for a priority strategy call. Our team will validate goals, service capacity and the best engagement format.',
          'La estructura que informaste indica potencial para una conversación comercial prioritaria. Nuestro equipo va a validar metas, capacidad de atención y el formato de acompañamiento.')
      };
    }
    if (score >= 60 && isRecurringFit) {
      return {
        tier: 'B',
        title: tl(lang,
          'Seu negócio está dentro do perfil de análise.',
          'Your business fits our assessment profile.',
          'Tu negocio está dentro del perfil de análisis.'),
        copy: tl(lang,
          'Há sinais de aderência ao Método BNC. A próxima conversa deve confirmar o gargalo principal, a estrutura da equipe e o melhor momento para começar.',
          'There are clear signs of alignment with the BNC Method. The next conversation should confirm your main bottleneck, team structure and timing.',
          'Hay señales de afinidad con el Método BNC. La próxima conversación debe confirmar el cuello de botella principal, la estructura del equipo y el mejor momento para empezar.')
      };
    }
    if (score >= 40) {
      return {
        tier: 'C',
        title: tl(lang,
          'Uma avaliação de consultoria pode ser o melhor primeiro passo.',
          'Consulting may be the best first step.',
          'Una evaluación de consultoría puede ser el mejor primer paso.'),
        copy: tl(lang,
          'Seu negócio apresenta potencial, mas pode se beneficiar primeiro de organização, prioridades e processos. A equipe avaliará se a Consultoria BNC é o formato mais adequado.',
          'Your business shows potential, but may benefit first from clearer priorities, processes and internal organization.',
          'Tu negocio presenta potencial, pero puede beneficiarse primero de organización, prioridades y procesos. El equipo evaluará si la Consultoría BNC es el formato más adecuado.')
      };
    }
    return {
      tier: 'D',
      title: tl(lang,
        'Seu próximo passo é fortalecer a base da operação.',
        'Your next step is strengthening the business foundation.',
        'Tu próximo paso es fortalecer la base de la operación.'),
      copy: tl(lang,
        'Neste momento, conteúdo, organização comercial e uma orientação inicial podem gerar mais valor antes de um acompanhamento recorrente. Ainda assim, você pode enviar o diagnóstico para nossa equipe.',
        'At this stage, practical content, commercial organization and initial guidance may create more value before an ongoing engagement.',
        'En este momento, contenido, organización comercial y una orientación inicial pueden generar más valor antes de un acompañamiento recurrente. Aun así, puedes enviar el diagnóstico a nuestro equipo.')
    };
  }

  function buildWhatsappMessage(data, score, classification) {
    const selectedText = id => {
      const select = document.querySelector(`#${id}`);
      return select?.options[select.selectedIndex]?.text || '';
    };
    const revenueLabel = revenue.options[revenue.selectedIndex]?.text || data.revenue;
    const countryLabel = country.options[country.selectedIndex]?.text || data.country;
    const businessTypeLabel = selectedText('business-type') || data.businessType;
    const teamSizeLabel = selectedText('team-size') || data.teamSize;
    const leadOwnerLabel = selectedText('lead-owner') || data.leadOwner;
    const challengeLabel = selectedText('challenge') || data.challenge;
    const interestLabel = selectedText('interest') || data.interest;
    const timelineLabel = selectedText('timeline') || data.timeline;
    const lang = data.language;
    const label = (pt, en, es) => tl(lang, pt, en, es);
    const lines = [
      label(
        'Olá! Concluí o diagnóstico no site da Beleza na Capital.',
        'Hi! I completed the assessment on the Beleza na Capital website.',
        '¡Hola! Completé el diagnóstico en el sitio de Beleza na Capital.'
      ),
      '',
      `${label('Classificação', 'Classification', 'Clasificación')}: Lead ${classification.tier} (${score} ${label('pontos', 'points', 'puntos')})`,
      `${label('Nome', 'Name', 'Nombre')}: ${data.name}`,
      `${label('Negócio', 'Business', 'Negocio')}: ${data.businessName}`,
      `${label('País/cidade', 'Country/city', 'País/ciudad')}: ${countryLabel}, ${data.city}, ${data.region}`,
      `${label('Tipo', 'Type', 'Tipo')}: ${businessTypeLabel}`,
      `${label('Faturamento', 'Monthly revenue', 'Facturación')}: ${revenueLabel}`,
      `${label('Equipe', 'Team', 'Equipo')}: ${teamSizeLabel}`,
      `${label('Atendimento dos contatos', 'Lead handling', 'Atención de los contactos')}: ${leadOwnerLabel}`,
      `${label('Principal desafio', 'Main challenge', 'Principal desafío')}: ${challengeLabel}`,
      `${label('Interesse', 'Interest', 'Interés')}: ${interestLabel}`,
      `${label('Prazo', 'Timeline', 'Plazo')}: ${timelineLabel}`,
      `${label('WhatsApp informado', 'WhatsApp', 'WhatsApp informado')}: ${data.phone}`
    ];
    if (data.marketingInvestment) {
      lines.push(`${label('Investimento atual em marketing', 'Current marketing investment', 'Inversión actual en marketing')}: ${data.marketingInvestment}`);
    }
    if (data.email) lines.push(`${label('E-mail', 'Email', 'Correo')}: ${data.email}`);
    return `https://wa.me/5561995055390?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  nextButton.addEventListener('click', () => {
    if (!validateCurrentStep()) return;
    if (currentStep === 0 && typeof window.gtag === 'function') {
      window.gtag('event', 'diagnostic_started', { country: country.value });
    }
    showStep(currentStep + 1);
  });

  backButton.addEventListener('click', () => showStep(currentStep - 1));
  country.addEventListener('change', updateRevenueOptions);

  form.addEventListener('submit', event => {
    event.preventDefault();
    // so conclui na ultima etapa, e confere todas as anteriores
    for (let i = 0; i < steps.length; i++) {
      const pendente = Array.from(steps[i].querySelectorAll('[required]'))
        .find(campo => !campo.checkValidity());
      if (pendente) {
        showStep(i);
        errorBox.textContent = pendente.type === 'checkbox'
          ? t('Você precisa autorizar o contato para continuar.', 'You must authorize contact to continue.', 'Necesitas autorizar el contacto para continuar.')
          : t('Preencha todos os campos obrigatórios desta etapa.', 'Complete all required fields in this step.', 'Completa todos los campos obligatorios de este paso.');
        pendente.focus();
        return;
      }
    }
    const data = Object.fromEntries(new FormData(form).entries());
    const score = calculateScore(data);
    const classification = classify(score, data);
    document.querySelector('#result-badge').textContent = `${t('Perfil', 'Profile', 'Perfil')} ${classification.tier}`;
    document.querySelector('#result-title').textContent = classification.title;
    document.querySelector('#result-copy').textContent = classification.copy;
    document.querySelector('#result-whatsapp').href = buildWhatsappMessage(data, score, classification);
    form.hidden = true;
    result.hidden = false;
    result.focus();
    leadId = gerarLeadId();
    enviarParaRadar({
      type: 'lead',
      leadId: leadId,
      tier: classification.tier,
      score: score,
      origem: window.location.href,
      campos: montarCamposDoRadar(data)
    }, false);
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'diagnostic_completed', {
        country: data.country,
        lead_tier: classification.tier,
        interest: data.interest
      });
    }
  });

  document.querySelector('#result-whatsapp').addEventListener('click', () => {
    if (leadId) enviarParaRadar({ type: 'whatsapp_click', leadId: leadId }, true);
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'conversion', {
        send_to: 'AW-18156422201/R5uZCI3vyqscELmI1NFD',
        transport_type: 'beacon'
      });
    }
  });

  function translateEnglishUi() {
    document.documentElement.lang = 'en-US';
    document.title = 'Beauty Business Assessment | Beleza na Capital';
    const set = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value;
    };
    set('.qualification-intro .section-label', 'Business assessment');
    set('.qualification-intro h1', 'Let’s understand where your business is today.');
    set('.qualification-intro p', 'Your answers help us identify the most appropriate next step based on market, revenue, team structure and execution capacity.');
    set('#step-1-title', 'Where does your business operate?');
    set('[data-step="1"] .form-step-intro', 'We will use the appropriate currency and qualification ranges for your market.');
    set('#step-2-title', 'Tell us about the business.');
    set('[data-step="2"] .form-step-intro', 'We evaluate both business size and the structure available to handle growth.');
    set('#step-3-title', 'What needs to change first?');
    set('[data-step="3"] .form-step-intro', 'This helps us focus the next conversation on the main bottleneck.');
    set('#step-4-title', 'How can we contact you?');
    set('[data-step="4"] .form-step-intro', 'These details will only be used to continue your assessment.');
    const labelMap = {
      country: 'Country *', language: 'Preferred language *', city: 'City *', region: 'State or region *',
      'business-type': 'Business type *', 'operation-time': 'Time in business *', revenue: 'Average monthly revenue *',
      'team-size': 'People in the business *', 'decision-role': 'Your role *', 'lead-owner': 'Who handles new leads? *',
      challenge: 'Main challenge *', timeline: 'When do you want to start? *', interest: 'Preferred format *',
      'marketing-investment': 'Current monthly marketing investment', name: 'Name *', 'business-name': 'Business name *',
      phone: 'WhatsApp with country code *', email: 'Email'
    };
    Object.entries(labelMap).forEach(([id, value]) => set(`label[for="${id}"]`, value));
    const optionTranslations = {
      '#country': { '': 'Select', br: 'Brazil', us: 'United States', other: 'Another country' },
      '#business-type': { '': 'Select', 'Salão de beleza': 'Beauty salon', Barbearia: 'Barbershop', 'Clínica de estética': 'Aesthetics clinic', 'Profissional individual': 'Independent professional', 'Outro negócio da beleza': 'Other beauty business' },
      '#operation-time': { '': 'Select', 'Ainda não abriu': 'Not open yet', 'Menos de 1 ano': 'Less than 1 year', 'De 1 a 3 anos': '1 to 3 years', 'Mais de 3 anos': 'More than 3 years' },
      '#team-size': { '': 'Select', '1': 'Only me', '2-4': '2 to 4 people', '5-10': '5 to 10 people', '10+': 'More than 10 people' },
      '#decision-role': { '': 'Select', owner: 'Owner or partner', decision: 'Decision maker', team: 'Team member', research: 'Researching for someone else' },
      '#lead-owner': { '': 'Select', reception: 'Front desk', sales: 'Sales team', owner: 'The owner', none: 'No one assigned' },
      '#challenge': { '': 'Select', 'Atrair novos clientes': 'Attract new clients', 'Converter contatos em agendamentos': 'Convert leads into bookings', 'Organizar recepção e follow-up': 'Improve front desk and follow-up', 'Aumentar recorrência': 'Increase retention', 'Organizar toda a operação': 'Organize the full operation', 'Ainda não sei': 'Not sure yet' },
      '#timeline': { '': 'Select', now: 'Immediately', '30': 'Within 30 days', '60': 'Within 30 to 60 days', later: 'After 60 days', research: 'Just researching' },
      '#interest': { '': 'Select', 'Método BNC recorrente': 'Ongoing BNC Method', 'Consultoria BNC': 'BNC Consulting', 'Quero uma recomendação': 'I want a recommendation' }
    };
    Object.entries(optionTranslations).forEach(([selector, translations]) => {
      const select = document.querySelector(selector);
      if (!select) return;
      Array.from(select.options).forEach(option => {
        if (translations[option.value]) option.textContent = translations[option.value];
      });
    });
    set('#back-button', 'Back');
    set('#next-button', 'Continue');
    set('#submit-button', 'View result');
    set('#result-whatsapp', 'Continue on WhatsApp');
    const consentText = document.querySelector('.consent-row span');
    if (consentText) consentText.innerHTML = 'I authorize Beleza na Capital to use this information to assess my business and contact me, according to the <a class="gold" href="/politica-de-privacidade/" target="_blank" rel="noopener">Privacy Policy</a>.';
    const revenueText = {
      '': 'Select', 'us-under-5': 'Up to $5,000', 'us-5-8': '$5,000 to $8,000', 'us-8-15': '$8,000 to $15,000',
      'us-15-25': '$15,000 to $25,000', 'us-25-50': '$25,000 to $50,000', 'us-over-50': 'Over $50,000'
    };
    Array.from(revenue.options).forEach(option => { if (revenueText[option.value]) option.textContent = revenueText[option.value]; });
    showStep(currentStep);
  }

  function translateSpanishUi() {
    document.documentElement.lang = 'es';
    document.title = 'Diagnóstico para tu Negocio de Belleza | Beleza na Capital';
    const set = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = value;
    };
    set('.qualification-intro .section-label', 'Diagnóstico del negocio');
    set('.qualification-intro h1', 'Vamos a entender en qué punto está tu negocio hoy.');
    set('.qualification-intro p', 'Tus respuestas nos ayudan a identificar el siguiente paso más adecuado según mercado, facturación, estructura del equipo y capacidad de ejecución.');
    set('#step-1-title', '¿Dónde opera tu negocio?');
    set('[data-step="1"] .form-step-intro', 'Vamos a usar la moneda y los rangos de calificación adecuados para tu mercado.');
    set('#step-2-title', 'Cuéntanos sobre el negocio.');
    set('[data-step="2"] .form-step-intro', 'Evaluamos tanto el tamaño del negocio como la estructura disponible para sostener el crecimiento.');
    set('#step-3-title', '¿Qué necesita cambiar primero?');
    set('[data-step="3"] .form-step-intro', 'Esto nos ayuda a enfocar la próxima conversación en el cuello de botella principal.');
    set('#step-4-title', '¿Cómo podemos contactarte?');
    set('[data-step="4"] .form-step-intro', 'Estos datos se usarán solamente para dar continuidad a tu diagnóstico.');
    const labelMap = {
      country: 'País *', language: 'Idioma preferido *', city: 'Ciudad *', region: 'Estado o región *',
      'business-type': 'Tipo de negocio *', 'operation-time': 'Tiempo de operación *', revenue: 'Facturación mensual promedio *',
      'team-size': 'Personas en el negocio *', 'decision-role': 'Tu rol *', 'lead-owner': '¿Quién atiende los nuevos contactos? *',
      challenge: 'Principal desafío *', timeline: '¿Cuándo quieres empezar? *', interest: 'Formato preferido *',
      'marketing-investment': 'Inversión mensual actual en marketing', name: 'Nombre *', 'business-name': 'Nombre del negocio *',
      phone: 'WhatsApp con código de país *', email: 'Correo electrónico'
    };
    Object.entries(labelMap).forEach(([id, value]) => set(`label[for="${id}"]`, value));
    const optionTranslations = {
      '#country': { '': 'Selecciona', br: 'Brasil', us: 'Estados Unidos', other: 'Otro país' },
      '#business-type': { '': 'Selecciona', 'Salão de beleza': 'Salón de belleza', Barbearia: 'Barbería', 'Clínica de estética': 'Clínica de estética', 'Profissional individual': 'Profesional independiente', 'Outro negócio da beleza': 'Otro negocio de belleza' },
      '#operation-time': { '': 'Selecciona', 'Ainda não abriu': 'Todavía no abrió', 'Menos de 1 ano': 'Menos de 1 año', 'De 1 a 3 anos': 'De 1 a 3 años', 'Mais de 3 anos': 'Más de 3 años' },
      '#team-size': { '': 'Selecciona', '1': 'Solo yo', '2-4': 'De 2 a 4 personas', '5-10': 'De 5 a 10 personas', '10+': 'Más de 10 personas' },
      '#decision-role': { '': 'Selecciona', owner: 'Dueño o socio', decision: 'Tomo la decisión', team: 'Parte del equipo', research: 'Estoy investigando para otra persona' },
      '#lead-owner': { '': 'Selecciona', reception: 'La recepción', sales: 'Equipo comercial', owner: 'El dueño', none: 'Nadie definido' },
      '#challenge': { '': 'Selecciona', 'Atrair novos clientes': 'Atraer nuevos clientes', 'Converter contatos em agendamentos': 'Convertir contactos en citas', 'Organizar recepção e follow-up': 'Organizar la recepción y el seguimiento', 'Aumentar recorrência': 'Aumentar la recurrencia', 'Organizar toda a operação': 'Organizar toda la operación', 'Ainda não sei': 'Todavía no lo sé' },
      '#timeline': { '': 'Selecciona', now: 'De inmediato', '30': 'En los próximos 30 días', '60': 'En 30 a 60 días', later: 'Después de 60 días', research: 'Solo estoy investigando' },
      '#interest': { '': 'Selecciona', 'Método BNC recorrente': 'Método BNC recurrente', 'Consultoria BNC': 'Consultoría BNC', 'Quero uma recomendação': 'Quiero una recomendación' }
    };
    Object.entries(optionTranslations).forEach(([selector, translations]) => {
      const select = document.querySelector(selector);
      if (!select) return;
      Array.from(select.options).forEach(option => {
        if (translations[option.value]) option.textContent = translations[option.value];
      });
    });
    set('#back-button', 'Volver');
    set('#next-button', 'Continuar');
    set('#submit-button', 'Ver resultado');
    set('#result-whatsapp', 'Continuar por WhatsApp');
    const consentText = document.querySelector('.consent-row span');
    if (consentText) consentText.innerHTML = 'Autorizo a Beleza na Capital a usar esta información para evaluar mi negocio y contactarme, de acuerdo con la <a class="gold" href="/politica-de-privacidade/" target="_blank" rel="noopener">Política de Privacidad</a>.';
    updateRevenueOptions();
    showStep(currentStep);
  }

  const params = new URLSearchParams(window.location.search);
  const presetCountry = params.get('country');
  const presetLanguage = params.get('lang');
  const presetInterest = params.get('interest');
  if (presetCountry && revenueValues[presetCountry]) country.value = presetCountry;
  if (presetLanguage && SUPPORTED_LANGS.includes(presetLanguage)) language.value = presetLanguage;
  if (presetInterest === 'method') interest.value = 'Método BNC recorrente';
  if (presetInterest === 'consulting') interest.value = 'Consultoria BNC';
  updateRevenueOptions();
  if (presetLanguage === 'en') translateEnglishUi();
  if (presetLanguage === 'es') translateSpanishUi();
  showStep(0);
})();
