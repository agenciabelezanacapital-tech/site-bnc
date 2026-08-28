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

  function isEnglish() {
    return language.value === 'en';
  }

  const revenueOptions = {
    br: [
      ['', 'Selecione'],
      ['br-under-30', 'Até R$ 30 mil'],
      ['br-30-40', 'R$ 30 mil a R$ 40 mil'],
      ['br-40-70', 'R$ 40 mil a R$ 70 mil'],
      ['br-70-100', 'R$ 70 mil a R$ 100 mil'],
      ['br-100-200', 'R$ 100 mil a R$ 200 mil'],
      ['br-over-200', 'Acima de R$ 200 mil']
    ],
    us: [
      ['', 'Select'],
      ['us-under-5', 'Até US$ 5 mil'],
      ['us-5-8', 'US$ 5 mil a US$ 8 mil'],
      ['us-8-15', 'US$ 8 mil a US$ 15 mil'],
      ['us-15-25', 'US$ 15 mil a US$ 25 mil'],
      ['us-25-50', 'US$ 25 mil a US$ 50 mil'],
      ['us-over-50', 'Acima de US$ 50 mil']
    ],
    other: [
      ['', 'Selecione'],
      ['other-under-8', 'Equivalente a menos de US$ 8 mil'],
      ['other-8-15', 'Equivalente a US$ 8 mil a US$ 15 mil'],
      ['other-15-25', 'Equivalente a US$ 15 mil a US$ 25 mil'],
      ['other-over-25', 'Equivalente a mais de US$ 25 mil']
    ]
  };

  function updateRevenueOptions() {
    const options = revenueOptions[country.value];
    revenue.innerHTML = '';
    if (!options) {
      revenue.disabled = true;
      revenue.add(new Option('Selecione primeiro o país', ''));
      return;
    }
    options.forEach(([value, label]) => revenue.add(new Option(label, value)));
    revenue.disabled = false;
  }

  function showStep(index) {
    currentStep = index;
    steps.forEach((step, stepIndex) => step.classList.toggle('is-active', stepIndex === index));
    progressBar.style.width = `${((index + 1) / steps.length) * 100}%`;
    const labels = isEnglish()
      ? ['Market', 'Business', 'Goals', 'Contact']
      : ['Mercado', 'Operação', 'Objetivo', 'Contato'];
    progressLabel.textContent = isEnglish()
      ? `Step ${index + 1} of ${steps.length} — ${labels[index]}`
      : `Etapa ${index + 1} de ${steps.length} — ${labels[index]}`;
    backButton.hidden = index === 0;
    nextButton.hidden = index === steps.length - 1;
    submitButton.hidden = index !== steps.length - 1;
    errorBox.textContent = '';
    steps[index].querySelector('h2').focus?.();
  }

  function validateCurrentStep() {
    const requiredFields = Array.from(steps[currentStep].querySelectorAll('[required]'));
    const invalid = requiredFields.find(field => !field.checkValidity());
    if (!invalid) return true;
    errorBox.textContent = invalid.type === 'checkbox'
      ? (isEnglish() ? 'You must authorize contact to continue.' : 'Você precisa autorizar o contato para continuar.')
      : (isEnglish() ? 'Complete all required fields in this step.' : 'Preencha todos os campos obrigatórios desta etapa.');
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
    const english = data.language === 'en';
    if (score >= 80 && isRecurringFit) {
      if (english) return { tier: 'A', title: 'Your business is a strong fit for the BNC Method.', copy: 'Your answers indicate potential for a priority strategy call. Our team will validate goals, service capacity and the best engagement format.' };
      return { tier: 'A', title: 'Seu negócio tem forte aderência ao Método BNC.', copy: 'A estrutura informada indica potencial para uma conversa comercial prioritária. Nossa equipe vai validar metas, capacidade de atendimento e o formato de acompanhamento.' };
    }
    if (score >= 60 && isRecurringFit) {
      if (english) return { tier: 'B', title: 'Your business fits our assessment profile.', copy: 'There are clear signs of alignment with the BNC Method. The next conversation should confirm your main bottleneck, team structure and timing.' };
      return { tier: 'B', title: 'Seu negócio está dentro do perfil de análise.', copy: 'Há sinais de aderência ao Método BNC. A próxima conversa deve confirmar o gargalo principal, a estrutura da equipe e o melhor momento para começar.' };
    }
    if (score >= 40) {
      if (english) return { tier: 'C', title: 'Consulting may be the best first step.', copy: 'Your business shows potential, but may benefit first from clearer priorities, processes and internal organization.' };
      return { tier: 'C', title: 'Uma avaliação de consultoria pode ser o melhor primeiro passo.', copy: 'Seu negócio apresenta potencial, mas pode se beneficiar primeiro de organização, prioridades e processos. A equipe avaliará se a Consultoria BNC é o formato mais adequado.' };
    }
    if (english) return { tier: 'D', title: 'Your next step is strengthening the business foundation.', copy: 'At this stage, practical content, commercial organization and initial guidance may create more value before an ongoing engagement.' };
    return { tier: 'D', title: 'Seu próximo passo é fortalecer a base da operação.', copy: 'Neste momento, conteúdo, organização comercial e uma orientação inicial podem gerar mais valor antes de um acompanhamento recorrente. Ainda assim, você pode enviar o diagnóstico para nossa equipe.' };
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
    const english = data.language === 'en';
    const lines = [
      english ? 'Hi! I completed the assessment on the Beleza na Capital website.' : 'Olá! Concluí o diagnóstico no site da Beleza na Capital.',
      '',
      `${english ? 'Classification' : 'Classificação'}: Lead ${classification.tier} (${score} ${english ? 'points' : 'pontos'})`,
      `${english ? 'Name' : 'Nome'}: ${data.name}`,
      `${english ? 'Business' : 'Negócio'}: ${data.businessName}`,
      `${english ? 'Country/city' : 'País/cidade'}: ${countryLabel} — ${data.city}, ${data.region}`,
      `${english ? 'Type' : 'Tipo'}: ${businessTypeLabel}`,
      `${english ? 'Monthly revenue' : 'Faturamento'}: ${revenueLabel}`,
      `${english ? 'Team' : 'Equipe'}: ${teamSizeLabel}`,
      `${english ? 'Lead handling' : 'Atendimento dos contatos'}: ${leadOwnerLabel}`,
      `${english ? 'Main challenge' : 'Principal desafio'}: ${challengeLabel}`,
      `${english ? 'Interest' : 'Interesse'}: ${interestLabel}`,
      `${english ? 'Timeline' : 'Prazo'}: ${timelineLabel}`,
      `${english ? 'WhatsApp' : 'WhatsApp informado'}: ${data.phone}`
    ];
    if (data.marketingInvestment) lines.push(`Investimento atual em marketing: ${data.marketingInvestment}`);
    if (data.email) lines.push(`E-mail: ${data.email}`);
    return `https://wa.me/556196112266?text=${encodeURIComponent(lines.join('\n'))}`;
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
    if (!validateCurrentStep()) return;
    const data = Object.fromEntries(new FormData(form).entries());
    const score = calculateScore(data);
    const classification = classify(score, data);
    document.querySelector('#result-badge').textContent = `Perfil ${classification.tier}`;
    document.querySelector('#result-title').textContent = classification.title;
    document.querySelector('#result-copy').textContent = classification.copy;
    document.querySelector('#result-whatsapp').href = buildWhatsappMessage(data, score, classification);
    form.hidden = true;
    result.hidden = false;
    result.focus();
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'diagnostic_completed', {
        country: data.country,
        lead_tier: classification.tier,
        interest: data.interest
      });
    }
  });

  document.querySelector('#result-whatsapp').addEventListener('click', () => {
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

  const params = new URLSearchParams(window.location.search);
  const presetCountry = params.get('country');
  const presetLanguage = params.get('lang');
  const presetInterest = params.get('interest');
  if (presetCountry && revenueOptions[presetCountry]) country.value = presetCountry;
  if (presetLanguage && ['pt', 'en'].includes(presetLanguage)) language.value = presetLanguage;
  if (presetInterest === 'method') interest.value = 'Método BNC recorrente';
  if (presetInterest === 'consulting') interest.value = 'Consultoria BNC';
  updateRevenueOptions();
  if (presetLanguage === 'en') translateEnglishUi();
  showStep(0);
})();
