const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const vouchersPath = path.join(__dirname, 'vouchers.json');

function getVouchers() {
  if (!fs.existsSync(vouchersPath)) {
    return {};
  }
  const data = fs.readFileSync(vouchersPath, 'utf-8');
  return JSON.parse(data);
}

function saveVouchers(vouchers) {
  fs.writeFileSync(vouchersPath, JSON.stringify(vouchers, null, 2));
}

function generateVoucherCode() {
  return crypto.randomBytes(8).toString('hex').toUpperCase();
}

// API routes
app.get('/api/vouchers/status', (req, res) => {
  const { voucherCode } = req.query;
  if (!voucherCode) {
    return res.status(400).json({ message: 'Voucher code is required' });
  }

  const vouchers = getVouchers();
  const voucher = vouchers[voucherCode];

  if (!voucher) {
    return res.json({ status: false });
  }

  res.json({
    status: voucher.status,
    amount: voucher.amount
  });
});

app.put('/api/vouchers/mark-used', (req, res) => {
  const { voucherCode } = req.body;
  if (!voucherCode) {
    return res.status(400).json({ message: 'Voucher code is required' });
  }

  const vouchers = getVouchers();
  const voucher = vouchers[voucherCode];

  if (!voucher || voucher.status !== 'active') {
    return res.status(400).json({ message: 'Voucher not found or already used' });
  }

  voucher.status = 'used';
  saveVouchers(vouchers);

  res.json({ message: 'Voucher marked as used' });
});

app.post('/api/vouchers/generate', (req, res) => {
  const { amount } = req.body;
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ message: 'Valid amount is required' });
  }

  const code = generateVoucherCode();
  const vouchers = getVouchers();

  if (vouchers[code]) {
    // Rare collision, generate again
    return app.post('/api/vouchers/generate')(req, res);
  }

  vouchers[code] = {
    amount,
    status: 'active',
    created_at: new Date().toISOString()
  };

  saveVouchers(vouchers);

  res.status(201).json({ code, amount });
});

// Serve the HTML page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Voucher server running on http://localhost:${PORT}`);
});