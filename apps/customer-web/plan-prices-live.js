// Website pricing: shows the plan prices the founder set in the console (public /billing/plans).
// If the server can't be reached, the printed prices stay as they are.
(function () {
  const MAP = { starter: 'RETAIL_STARTER', growth: 'WHOLESALE_GROWTH', enterprise: 'ENTERPRISE_LOGISTICS' };
  const ORDER = ['starter', 'growth', 'enterprise'];
  const base = () => {
    if (window.STOKROVA_API) return window.STOKROVA_API;
    const h = location.hostname, p = location.port;
    return (h === 'localhost' || h === '127.0.0.1') && p !== '3000' && p !== '' ? 'http://localhost:3000/v1' : '/v1';
  };
  const fmt = (minor, cur, decimals) => (Number(minor) / 100).toLocaleString('en-US', { style: 'currency', currency: cur || 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  async function apply() {
    let plans;
    try {
      const res = await fetch(base() + '/billing/plans');
      if (!res.ok) return;
      plans = await res.json();
    } catch (_e) { return; }
    if (!Array.isArray(plans)) return;
    const byTier = Object.fromEntries(plans.map((p) => [p.tier, p]));
    const cards = document.querySelectorAll('.pricing-card-price');
    ORDER.forEach((id, i) => {
      const p = byTier[MAP[id]];
      if (!p) return;
      if (cards[i]) cards[i].textContent = fmt(p.monthly_price_minor, p.currency, 2);
      const sign = document.querySelector(`#plan-card-${id} div:nth-of-type(2)`);
      if (sign) sign.textContent = fmt(p.monthly_price_minor, p.currency, 0);
      const opt = document.querySelector(`#business-plan-select option[value="${id}"]`);
      if (opt) opt.textContent = `${p.name} - ${fmt(p.monthly_price_minor, p.currency, 0)}/mo${id === 'growth' ? ' (Recommended)' : ''}`;
    });
  }
  window.stokrovaRefreshPrices = apply;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply); else apply();
  document.addEventListener('click', (e) => {
    if (e.target.closest('[onclick*="openRegisterModal"]')) {
      setTimeout(apply, 50);
    }
  });
})();
