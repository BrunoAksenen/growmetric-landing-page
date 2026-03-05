const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const ALLOWED_FATURAMENTO = [
  'Até R$ 500 mil',
  'R$ 500 mil a R$ 2 milhões',
  'R$ 2 milhões a R$ 10 milhões',
  'Acima de R$ 10 milhões',
];

function validate(body) {
  const errors = {};
  const { nome, email, telefone, empresa, faturamento, consent } = body;

  if (!nome || nome.trim().length < 2)
    errors.nome = 'Nome deve ter pelo menos 2 caracteres.';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    errors.email = 'E-mail inválido.';

  const digits = (telefone || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 11)
    errors.telefone = 'Telefone inválido.';

  if (!empresa || empresa.trim().length < 1)
    errors.empresa = 'Nome da empresa obrigatório.';

  if (!faturamento || !ALLOWED_FATURAMENTO.includes(faturamento))
    errors.faturamento = 'Selecione uma faixa de faturamento.';

  if (!consent)
    errors.consent = 'Consentimento obrigatório.';

  return errors;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const errors = validate(req.body || {});
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ errors });
  }

  const { nome, email, telefone, empresa, faturamento } = req.body;

  const { error } = await supabase.from('leads').insert({
    nome: nome.trim(),
    email: email.trim().toLowerCase(),
    telefone: telefone.trim(),
    empresa: empresa.trim(),
    faturamento,
    consent: true,
  });

  if (error) {
    console.error('[leads] Supabase error:', error.message);
    return res.status(500).json({ error: 'Erro ao salvar. Tente novamente.' });
  }

  return res.status(200).json({ success: true });
};
