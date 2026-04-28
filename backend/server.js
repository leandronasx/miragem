/**
 * Backend Miragem Fantasia – substitua armazenamento em memória pela sua API de banco de dados.
 * Endpoints: POST /api/register, POST /api/login, GET/POST /api/collection, POST /api/checkout, POST /api/admin/login, POST /api/admin/content
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Stripe = require('stripe');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '1234';
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_51TBQwqA20NuqsR1Bf8OPUUiivchRpHE7eUXnvdqGV9ips20Y4mPoQXL0hHwgdLyVrF73nhalvXhSrtjF74LdGi0o00RCHBUNmS';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const stripe = new Stripe(STRIPE_SECRET_KEY);

app.use(cors());
// Webhook Stripe precisa do body cru – registrar antes de express.json()
app.post('/api/stripe-webhook', express.raw({ type: 'application/json' }), (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    if (!STRIPE_WEBHOOK_SECRET) {
      return res.status(500).json({ error: 'Webhook secret não configurado' });
    }
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Stripe:', err.message);
    return res.status(400).send('Webhook Error: ' + err.message);
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.metadata && session.metadata.user_id;
    const plano = session.metadata && session.metadata.plano;
    if (userId && (plano === 'basic30' || plano === 'premium300' || plano === 'master600')) {
      const add = plano === 'basic30' ? 30 : plano === 'premium300' ? 300 : 600;
      diamonds[userId] = (diamonds[userId] || 0) + add;
      saveDiamonds();
      diamondHistory.push({ userId, type: 'credit', amount: add, at: new Date().toISOString(), note: 'Recarga ' + plano });
      saveDiamondHistory();
      console.log('Diamantes creditados:', userId, '+', add);
    }
  }
  res.json({ received: true });
});
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

function readJson(file, def) {
  try {
    const raw = fs.readFileSync(path.join(dataDir, file), 'utf8');
    return JSON.parse(raw);
  } catch (e) { return def; }
}
function writeJson(file, data) {
  fs.writeFileSync(path.join(dataDir, file), JSON.stringify(data, null, 2), 'utf8');
}

let users = readJson('users.json', []);
let collections = readJson('collections.json', {});
let contentIndex = readJson('content.json', { folders: [], tagsByFile: {} });
let diamonds = readJson('diamonds.json', {});
let diamondHistory = readJson('diamond_history.json', []);

function saveUsers() { writeJson('users.json', users); }
function saveCollections() { writeJson('collections.json', collections); }
function saveContent() { writeJson('content.json', contentIndex); }
function saveDiamonds() { writeJson('diamonds.json', diamonds); }
function saveDiamondHistory() { writeJson('diamond_history.json', diamondHistory); }

// POST /api/register – criar conta (conecte ao seu DB)
app.post('/api/register', (req, res) => {
  const { email, nome, senha } = req.body || {};
  if (!email) return res.status(400).json({ ok: false, error: 'Email obrigatório' });
  const existing = users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase());
  if (existing) return res.status(400).json({ ok: false, error: 'Email já cadastrado' });
  const id = 'user_' + Date.now();
  const user = { id, email, nome: nome || '', createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers();
  res.json({ ok: true, user: { id: user.id, email: user.email, nome: user.nome } });
});

// POST /api/login – login (valide senha no seu DB)
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body || {};
  if (!email) return res.status(400).json({ ok: false });
  const user = users.find(u => (u.email || '').toLowerCase() === (email || '').toLowerCase());
  if (!user) return res.status(401).json({ ok: false });
  res.json({ ok: true, user: { id: user.id, email: user.email, nome: user.nome } });
});

// GET /api/collection?userId= – compras + cards salvos
app.get('/api/collection', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ purchases: [], cards: [] });
  const col = collections[userId] || { purchases: [], cards: [] };
  res.json({ purchases: col.purchases || [], cards: col.cards || [] });
});

// POST /api/collection – salvar compras/cards do usuário
app.post('/api/collection', (req, res) => {
  const { userId, purchases, cards } = req.body || {};
  if (!userId) return res.status(400).json({ ok: false });
  const col = collections[userId] || { purchases: [], cards: [] };
  if (Array.isArray(purchases)) col.purchases = purchases;
  if (Array.isArray(cards)) col.cards = cards;
  collections[userId] = col;
  saveCollections();
  res.json({ ok: true });
});

// POST /api/checkout – registrar pagamento (integre gateway real)
app.post('/api/checkout', (req, res) => {
  const { userId, plano, method, details } = req.body || {};
  if (!userId || !plano) return res.status(400).json({ ok: false });
  const col = collections[userId] || { purchases: [], cards: [] };
  const planNames = { '10': 'Pacote 10 vídeos', '25': 'Pacote 25 vídeos', '50': 'Pacote 50 vídeos', 'mensal': 'Assinatura Mensal', 'trimestral': 'Assinatura Trimestral', 'anual': 'Assinatura Anual' };
  col.purchases = col.purchases || [];
  col.purchases.push({ planId: plano, planName: planNames[plano] || plano, date: new Date().toISOString().slice(0, 10), method: method || 'cartao' });
  collections[userId] = col;
  saveCollections();
  res.json({ ok: true });
});

// Planos de diamantes
const DIAMOND_PLANOS = {
  basic30: { amount: 699, diamonds: 30, name: 'Básico (30 diamantes)' },
  premium300: { amount: 5900, diamonds: 300, name: 'Premium (300 diamantes)' },
  master600: { amount: 9900, diamonds: 600, name: 'Master (600 diamantes)' },
};

// POST /api/create-checkout-session – criar sessão de pagamento Stripe (cartão + Pix)
app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { plano, success_url, cancel_url, user_id: userId } = req.body || {};
    if (!plano) return res.status(400).json({ error: 'Plano obrigatório' });
    const plan = DIAMOND_PLANOS[plano];
    if (!plan) return res.status(400).json({ error: 'Plano inválido.' });

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'pix'],
      line_items: [
        {
          price_data: {
            currency: 'brl',
            unit_amount: plan.amount,
            product_data: {
              name: `Miragem Fantasia – ${plan.name}`
            }
          },
          quantity: 1
        }
      ],
      metadata: { user_id: userId || '', plano: plano },
      success_url: success_url || 'http://localhost:3000/carteira.html?status=success',
      cancel_url: cancel_url || 'http://localhost:3000/compra.html?status=cancel'
    });

    res.json({ id: session.id, url: session.url });
  } catch (e) {
    console.error('Erro Stripe:', e);
    res.status(500).json({ error: 'Erro ao criar sessão de pagamento' });
  }
});

// GET /api/diamonds?userId= – saldo e histórico de diamantes
app.get('/api/diamonds', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ balance: 0, history: [] });
  const balance = diamonds[userId] || 0;
  const history = (diamondHistory || []).filter(h => h.userId === userId).slice(-50).reverse();
  res.json({ balance, history });
});

// POST /api/diamonds/credit – crédito após Mercado Pago (Next webhook); protegido por segredo
app.post('/api/diamonds/credit', (req, res) => {
  const secret = process.env.DIAMOND_CREDIT_SECRET || '';
  if (!secret || req.headers['x-mirage-credit-secret'] !== secret) {
    return res.status(401).json({ ok: false, error: 'Não autorizado' });
  }
  const { userId, amount, paymentRef } = req.body || {};
  const credit = parseInt(amount, 10) || 0;
  const ref = typeof paymentRef === 'string' ? paymentRef : '';
  if (!userId || credit <= 0 || !ref) {
    return res.status(400).json({ ok: false, error: 'userId, amount e paymentRef obrigatórios' });
  }
  const dup = (diamondHistory || []).some(
    (h) => h.userId === userId && String(h.note || '') === 'mp:' + ref
  );
  if (dup) {
    return res.json({ ok: true, duplicate: true, newBalance: diamonds[userId] || 0 });
  }
  diamonds[userId] = (diamonds[userId] || 0) + credit;
  saveDiamonds();
  diamondHistory.push({
    userId,
    type: 'credit',
    amount: credit,
    at: new Date().toISOString(),
    note: 'mp:' + ref,
  });
  saveDiamondHistory();
  res.json({ ok: true, newBalance: diamonds[userId] });
});

// POST /api/diamonds/use – debitar diamantes (ex.: 35 por 1 geração)
app.post('/api/diamonds/use', (req, res) => {
  const { userId, amount } = req.body || {};
  const debit = parseInt(amount, 10) || 0;
  if (!userId || debit <= 0) return res.status(400).json({ ok: false, error: 'userId e amount obrigatórios' });
  const current = diamonds[userId] || 0;
  if (current < debit) return res.status(400).json({ ok: false, error: 'Saldo insuficiente', balance: current });
  diamonds[userId] = current - debit;
  saveDiamonds();
  diamondHistory.push({ userId, type: 'debit', amount: debit, at: new Date().toISOString(), note: '1 geração' });
  saveDiamondHistory();
  res.json({ ok: true, newBalance: diamonds[userId] });
});

// POST /api/admin/login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) return res.json({ ok: true });
  res.status(401).json({ ok: false });
});

// GET /api/content – listar pastas/arquivos/tags (para o Explorar carregar conteúdo do admin)
app.get('/api/content', (req, res) => {
  res.json(contentIndex);
});

// POST /api/admin/content – adicionar pasta/arquivos e tags (persista no seu DB ou em content.json)
app.post('/api/admin/content', (req, res) => {
  const { folder, files, tags } = req.body || {};
  if (!folder) return res.status(400).json({ ok: false });
  const list = Array.isArray(files) ? files : (files ? [files] : []);
  const tagList = Array.isArray(tags) ? tags : (tags ? [tags] : []);
  contentIndex.folders = contentIndex.folders || [];
  if (!contentIndex.folders.includes(folder)) contentIndex.folders.push(folder);
  contentIndex.tagsByFile = contentIndex.tagsByFile || {};
  list.forEach(f => {
    const key = folder + '/' + (typeof f === 'string' ? f : f.name || '');
    contentIndex.tagsByFile[key] = tagList.length ? tagList : (contentIndex.tagsByFile[key] || []);
  });
  saveContent();
  res.json({ ok: true });
});

app.listen(PORT, () => console.log('Mirage API rodando em http://localhost:' + PORT));
