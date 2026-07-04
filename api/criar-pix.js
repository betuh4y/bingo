export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Método não permitido' });

  try {
    const { amount, description } = req.body;

    if (!amount || isNaN(amount) || Number(amount) <= 0)
      return res.status(400).json({ error: 'Valor inválido' });

    const token = process.env.MP_ACCESS_TOKEN;
    if (!token)
      return res.status(500).json({ error: 'Token MP não configurado no Vercel' });

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type':       'application/json',
        'Authorization':      `Bearer ${token}`,
        'X-Idempotency-Key':  `rifa-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      },
      body: JSON.stringify({
        transaction_amount: parseFloat(amount),
        description:        description || 'Rifa da Ava 🐱',
        payment_method_id:  'pix',
        payer: {
          email:          'participante@rifa.com',
          first_name:     'Participante',
          last_name:      'Rifa',
          identification: { type: 'CPF', number: '00000000000' },
        },
      }),
    });

    const data = await response.json();

    if (!response.ok)
      return res.status(400).json({ error: data.message || 'Erro no Mercado Pago' });

    const tx = data.point_of_interaction?.transaction_data;
    if (!tx?.qr_code)
      return res.status(500).json({ error: 'QR Code não retornado. Use o token de PRODUÇÃO.' });

    return res.status(200).json({
      qrCode:    tx.qr_code,
      qrBase64:  tx.qr_code_base64 || '',
      paymentId: data.id,
      expiresAt: data.date_of_expiration || '',
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno' });
  }
}
