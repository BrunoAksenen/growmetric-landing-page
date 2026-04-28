export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      nome,
      whatsapp,
      timestamp,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      fbclid,
      gclid,
      msclkid,
      source,
      medium,
      campaign,
      referrer,
      url,
    } = req.body;

    // Validation
    if (!nome || typeof nome !== 'string' || nome.trim().length < 3) {
      return res.status(400).json({ error: 'Nome inválido' });
    }

    if (!whatsapp || typeof whatsapp !== 'string') {
      return res.status(400).json({ error: 'WhatsApp inválido' });
    }

    const cleanWhatsapp = whatsapp.replace(/\D/g, '');
    if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 11) {
      return res.status(400).json({ error: 'WhatsApp inválido' });
    }

    // Check rate limiting (simple in-memory, for production use Redis)
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const now = Date.now();

    // Format WhatsApp with country code if needed
    const whatsappFormatted = cleanWhatsapp.length === 10
      ? `55${cleanWhatsapp}`
      : `55${cleanWhatsapp}`;

    // Send to n8n webhook
    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return res.status(500).json({ error: 'Configuração inválida' });
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Growmetric-Checkout/1.0',
      },
      body: JSON.stringify({
        nome: nome.trim(),
        whatsapp: cleanWhatsapp,
        whatsappFormatted: whatsappFormatted,
        timestamp: new Date().toISOString(),
        source: 'landing-page-broker-pro',
        ip: clientIp,
        // UTM Parameters
        utm_source: utm_source || null,
        utm_medium: utm_medium || null,
        utm_campaign: utm_campaign || null,
        utm_content: utm_content || null,
        utm_term: utm_term || null,
        // Click IDs
        fbclid: fbclid || null,
        gclid: gclid || null,
        msclkid: msclkid || null,
        // Alternative parameters
        source: source || null,
        medium: medium || null,
        campaign: campaign || null,
        // Referrer & URL
        referrer: referrer || null,
        landing_page_url: url || null,
      }),
    });

    if (!n8nResponse.ok) {
      console.error('n8n webhook error:', n8nResponse.status, n8nResponse.statusText);
      return res.status(500).json({ error: 'Erro ao processar pedido' });
    }

    // Success response with checkout URL
    return res.status(200).json({
      success: true,
      checkoutUrl: 'https://checkout.ticto.app/OF0F298AA',
      message: 'Pedido processado com sucesso',
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return res.status(500).json({
      error: 'Erro ao processar pedido',
      message: error.message,
    });
  }
}
