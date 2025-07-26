const express = require('express');
const fs = require('fs');
const axios = require('axios');
const cron = require('node-cron');
const { sendDailySummary, sendWeeklySummary } = require('./reports');

const app = express();
app.use(express.json());

const SALES_FILE = 'sales.json';
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1390212445393387722/u7DnLkBASoDfzacDHvlh13RgZILAzVL_yMWI4t7T3vQJ4WlPw4uCDlHiv68Nse-BAGKa';

// Initialize or read multi-store sales data
function readSales() {
  if (!fs.existsSync(SALES_FILE)) fs.writeFileSync(SALES_FILE, '{}');
  return JSON.parse(fs.readFileSync(SALES_FILE, 'utf-8'));
}

function writeSales(data) {
  fs.writeFileSync(SALES_FILE, JSON.stringify(data, null, 2));
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  const sale = req.body;

  if (!sale.store || !sale.item_sold || !sale.quantity || !sale.price || !sale.customer) {
    return res.status(400).send('Invalid sale payload.');
  }

  const storeName = sale.store;
  const timestamp = new Date().toISOString();
  const salesData = readSales();

  if (!salesData[storeName]) {
    salesData[storeName] = [];
  }

  salesData[storeName].push({ ...sale, timestamp });
  writeSales(salesData);

  res.status(200).send(`Sale recorded for store: ${storeName}`);
});

// Manual report trigger for testing
app.post('/generate-daily-report', async (req, res) => {
  const salesData = readSales();
  await sendDailySummary(salesData, DISCORD_WEBHOOK_URL);
  res.send("Manual daily report sent.");
});

app.post('/generate-weekly-report', async (req, res) => {
  const salesData = readSales();
  await sendWeeklySummary(salesData, DISCORD_WEBHOOK_URL);
  res.send("Manual weekly report sent.");
});

// Cron jobs: 9 PM EST (which is 2 AM UTC)
cron.schedule('0 2 * * *', async () => {
  const salesData = readSales();
  await sendDailySummary(salesData, DISCORD_WEBHOOK_URL);
});

// Weekly summary every Sunday at 2 AM UTC
cron.schedule('0 2 * * 0', async () => {
  const salesData = readSales();
  await sendWeeklySummary(salesData, DISCORD_WEBHOOK_URL);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 RedM Analytics Bot running on port ${PORT}`);
});
