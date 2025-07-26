const axios = require('axios');

function formatCurrency(amount) {
  return `$${amount.toFixed(2)}`;
}

function getTimeframeSales(sales, sinceDate) {
  return sales.filter(sale => new Date(sale.timestamp) >= sinceDate);
}

async function sendDailySummary(data, webhookUrl) {
  const since = new Date();
  since.setUTCHours(2, 0, 0, 0); // Midnight EST => 2 AM UTC

  const embeds = [];

  for (const store in data) {
    const dailySales = getTimeframeSales(data[store], since);
    if (dailySales.length === 0) continue;

    const itemTotals = {};
    const buyerTotals = {};
    let revenue = 0;

    for (const sale of dailySales) {
      revenue += sale.price * sale.quantity;
      itemTotals[sale.item_sold] = (itemTotals[sale.item_sold] || 0) + sale.quantity;
      buyerTotals[sale.customer] = (buyerTotals[sale.customer] || 0) + sale.quantity;
    }

    const bestItem = Object.entries(itemTotals).sort((a, b) => b[1] - a[1])[0];
    const bestBuyer = Object.entries(buyerTotals).sort((a, b) => b[1] - a[1])[0];

    embeds.push({
      title: `📊 Daily Report – ${store}`,
      color: 3447003,
      fields: [
        { name: "💰 Revenue", value: formatCurrency(revenue), inline: true },
        { name: "📦 Top Item", value: bestItem ? `${bestItem[0]} (${bestItem[1]})` : "None", inline: true },
        { name: "👤 Top Buyer", value: bestBuyer ? `${bestBuyer[0]} (${bestBuyer[1]})` : "None", inline: false }
      ],
      timestamp: new Date().toISOString()
    });
  }

  if (embeds.length > 0) {
    await axios.post(webhookUrl, { embeds });
  }
}

async function sendWeeklySummary(data, webhookUrl) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 7);

  const storeTotals = [];

  for (const store in data) {
    const weeklySales = getTimeframeSales(data[store], since);
    const revenue = weeklySales.reduce((sum, sale) => sum + sale.price * sale.quantity, 0);
    storeTotals.push([store, revenue]);
  }

  const ranked = storeTotals.sort((a, b) => b[1] - a[1]);

  const leaderboard = ranked.map(([store, total], index) =>
    `**${index + 1}. ${store}** — ${formatCurrency(total)}`).join('\n');

  if (leaderboard) {
    await axios.post(webhookUrl, {
      embeds: [{
        title: "🏆 Weekly Store Leaderboard",
        description: leaderboard,
        color: 15844367,
        timestamp: new Date().toISOString()
      }]
    });
  }
}

module.exports = { sendDailySummary, sendWeeklySummary };