const express = require('express');
const fs = require('fs');
const axios = require('axios');

const app = express();
app.use(express.json());

const SALES_FILE = 'sales.json';
const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1390212445393387722/u7DnLkBASoDfzacDHvlh13RgZILAzVL_yMWI4t7T3vQJ4WlPw4uCDlHiv68Nse-BAGKa';

// Helper functions
function readSales() {
  if (!fs.existsSync(SALES_FILE)) fs.writeFileSync(SALES_FILE, '[]');
  return JSON.parse(fs.readFileSync(SALES_FILE, 'utf-8'));
}

function writeSales(data) {
  fs.writeFileSync(SALES_FILE, JSON.stringify(data, null, 2));
}

function analyzeSales(sales) {
  const itemCount = {};
  const buyerCount = {};

  for (const sale of sales) {
    const item = sale.item_sold;
    const buyer = sale.customer;
    const quantity = sale.quantity;

    itemCount[item] = (itemCount[item] || 0) + quantity;
    buyerCount[buyer] = (buyerCount[buyer] || 0) + quantity;
  }

  const mostPopular = Object.entries(itemCount).sort((a, b) => b[1] - a[1])[0] || ["None", 0];
  const topBuyer = Object.entries(buyerCount).sort((a, b) => b[1] - a[1])[0] || ["None", 0];
  const totalRevenue = sales.reduce((sum, s) => sum + (s.price * s.quantity), 0);

  return {
    mostPopular,
    topBuyer,
    totalRevenue
  };
}

async function sendDiscordEmbed(analytics) {
  const [itemName, itemQty] = analytics.mostPopular;
  const [buyerName, buyerQty] = analytics.topBuyer;

  const embed = {
    embeds: [
      {
        title: "🛒 Storefront Update – Ross Handcrafted Provisions",
        color: 15844367,
        fields: [
          {
            name: "📦 Most Popular Item",
            value: `${itemName} — ${itemQty} sold`,
            inline: true
          },
          {
            name: "💰 Total Revenue",
            value: `$${analytics.totalRevenue.toFixed(2)}`,
            inline: true
          },
          {
            name: "👤 Top Buyer",
            value: `${buyerName} — ${buyerQty} total purchases`,
            inline: false
          }
        ],
        footer: {
          text: "Ross Handcrafted Provisions",
        },
        timestamp: new Date().toISOString()
      }
    ]
  };

  await axios.post(DISCORD_WEBHOOK_URL, embed);
}

// Endpoint to receive sales
app.post('/webhook', async (req, res) => {
  const sale = req.body;

  if (!sale.item_sold || !sale.quantity || !sale.price || !sale.customer) {
    return res.status(400).send('Invalid sale payload.');
  }

  const sales = readSales();
  sales.push(sale);
  writeSales(sales);

  const analytics = analyzeSales(sales);
  await sendDiscordEmbed(analytics);

  res.status(200).send('Sale recorded and Discord updated.');
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});