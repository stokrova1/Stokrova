export const executiveSample = [
  { day: 'Fri', date: 'Oct 9', sales: 48000, cost: 30000, previousSales: 43000, previousCost: 27520 },
  { day: 'Sat', date: 'Oct 10', sales: 52000, cost: 33000, previousSales: 47000, previousCost: 30080 },
  { day: 'Sun', date: 'Oct 11', sales: 54000, cost: 34000, previousSales: 50000, previousCost: 32000 },
  { day: 'Mon', date: 'Oct 12', sales: 51000, cost: 32000, previousSales: 46000, previousCost: 29440 },
  { day: 'Tue', date: 'Oct 13', sales: 55000, cost: 34730, previousSales: 52000, previousCost: 33280 },
  { day: 'Wed', date: 'Oct 14', sales: 60000, cost: 34000, previousSales: 55000, previousCost: 35750 },
  { day: 'Thu', date: 'Oct 15', sales: 62000, cost: 37200, previousSales: 55000, previousCost: 34650 },
];

export function summarizeSales(rows) {
  const sales = rows.reduce((sum, row) => sum + row.sales, 0);
  const cost = rows.reduce((sum, row) => sum + row.cost, 0);
  const profit = sales - cost;
  return { sales, cost, profit, margin: sales === 0 ? null : profit / sales * 100 };
}

export function compareSales(current, previous) {
  return {
    salesChange: previous.sales === 0 ? null : (current.sales - previous.sales) / previous.sales * 100,
    profitChange: previous.profit === 0 ? null : (current.profit - previous.profit) / previous.profit * 100,
    marginPoints: current.margin === null || previous.margin === null ? null : current.margin - previous.margin,
  };
}