// Confere no Mercado Pago se um pagamento do Raio-X foi aprovado. A pagina de
// obrigado usa isso para so marcar conversao quando o dinheiro entrou de verdade.
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const token = process.env.MP_ACCESS_TOKEN;
  const id = String((req.query || {}).id || '').replace(/\D/g, '').slice(0, 30);
  if (!token) { res.status(503).json({ erro: 'sem_token' }); return; }
  if (!id) { res.status(400).json({ erro: 'sem_id' }); return; }
  try {
    const r = await fetch('https://api.mercadopago.com/v1/payments/' + id, {
      headers: { Authorization: 'Bearer ' + token }
    });
    if (!r.ok) { res.status(404).json({ erro: 'nao_encontrado' }); return; }
    const p = await r.json();
    res.status(200).json({
      id: String(p.id),
      status: p.status,
      valor: p.transaction_amount,
      moeda: p.currency_id,
      raiox: String(p.external_reference || '').indexOf('raiox|') === 0
    });
  } catch (e) {
    res.status(502).json({ erro: 'mercado_pago' });
  }
};
