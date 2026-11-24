// Cria o checkout do Raio-X no Mercado Pago (Checkout Pro) com volta para
// /raio-x/obrigado/, onde a compra confirmada vira conversao no Google Ads e no GA4.
// Precisa da variavel de ambiente MP_ACCESS_TOKEN no Vercel. Sem ela, responde 503
// e a pagina cai no link de pagamento antigo.
const PRECO = 147;
const SITE = 'https://www.belezanacapital.com.br';

function limpar(v, max) {
  return String(v || '').replace(/[^\w.-]/g, '').slice(0, max);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.status(405).json({ erro: 'metodo' }); return; }
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) { res.status(503).json({ erro: 'sem_token' }); return; }

  let corpo = req.body || {};
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; } }
  const visita = limpar(corpo.visitaId, 60);
  const gclid = limpar(corpo.gclid, 200);

  const preferencia = {
    items: [{ id: 'raio-x', title: 'Raio-X de Presença Digital', quantity: 1, unit_price: PRECO, currency_id: 'BRL' }],
    external_reference: 'raiox|' + (visita || 'sem-visita') + '|' + Date.now().toString(36),
    metadata: { produto: 'raio-x', visita_id: visita, gclid: gclid },
    back_urls: {
      success: SITE + '/raio-x/obrigado/',
      pending: SITE + '/raio-x/obrigado/',
      failure: SITE + '/raio-x/?pagamento=nao-concluido'
    },
    auto_return: 'approved',
    notification_url: SITE + '/api/raiox-webhook'
  };

  try {
    const r = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(preferencia)
    });
    const d = await r.json();
    if (!r.ok || !d.init_point) { res.status(502).json({ erro: 'mercado_pago' }); return; }
    res.status(200).json({ url: d.init_point });
  } catch (e) {
    res.status(502).json({ erro: 'mercado_pago' });
  }
};
