// Recebe o aviso do Mercado Pago. Confere o pagamento direto na API dele (o aviso
// sozinho nao prova nada) e, se o Raio-X foi aprovado, grava a venda na planilha
// do radar, aba Leads, com a classificacao "Raio-X pago confirmado".
// Mesmo token publico que o /js/radar.js manda em todo evento.
const RADAR_TOKEN = 'bnc-radar-7fK3nQ2026';
const RADAR = 'https://script.google.com/macros/s/AKfycbwouEL3eGpbsJMefXOaKtw33LaGR3DWY9oukUoA59PgwBaRkvVpKhpGlRf_2KUUJ290/exec';

module.exports = async (req, res) => {
  const token = process.env.MP_ACCESS_TOKEN;
  let corpo = req.body || {};
  if (typeof corpo === 'string') { try { corpo = JSON.parse(corpo); } catch (e) { corpo = {}; } }
  const q = req.query || {};
  const tipo = corpo.type || corpo.topic || q.type || q.topic;
  const id = String((corpo.data && corpo.data.id) || q['data.id'] || q.id || '').replace(/\D/g, '');

  if (!token || tipo !== 'payment' || !id) { res.status(200).json({ ok: true, ignorado: true }); return; }

  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments/' + id, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (r.ok) {
      const p = await r.json();
      const ehRaiox = String(p.external_reference || '').indexOf('raiox|') === 0;
      if (p.status === 'approved' && ehRaiox) {
        const pagador = p.payer || {};
        const fone = pagador.phone ? String(pagador.phone.area_code || '') + String(pagador.phone.number || '') : '';
        await fetch(RADAR, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
          body: JSON.stringify({
            token: RADAR_TOKEN,
            type: 'lead',
            leadId: 'mp-' + p.id,
            visitaId: (p.metadata && p.metadata.visita_id) || '',
            origem: 'Mercado Pago',
            tier: 'Raio-X pago confirmado',
            campos: {
              produto: 'raio-x',
              nome: [pagador.first_name, pagador.last_name].filter(Boolean).join(' '),
              email: pagador.email || '',
              whatsapp: fone,
              negocio: '',
              cidade: '',
              instagram: '',
              interesse: 'Pagamento ' + p.id + ' aprovado no Mercado Pago (' + (p.payment_type_id || '') + ')',
              valor: String(p.transaction_amount || 147)
            }
          })
        });
      }
    }
  } catch (e) {}
  res.status(200).json({ ok: true });
};
