<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Preview and source delivery
- Founder navigation shows one isolated page at a time through founder-live.js; shared workspace introductions reuse existing heading nodes through workspace-enhancements.js. Why: tab content stays independent without duplicating controls or changing business logic.
- Keep presentation-only workspace enhancements in the shared preview script and mirror it under repository-changes/apps/customer-web for the approved original-repository delivery; this avoids altering business logic or requiring a backend.
- Company sales live in the user's repository database (executive_sales_entries + sales_orders/lines/payments via the NestJS /v1/analytics/executive API), not Lovable Cloud; the Cloud executive tables are deprecated. The user owns and connects that database live.
- Executive math lives in packages/domain/src/executive-sales.ts and is shared by snapshot, dashboard and AI; never accept browser-calculated figures.
- Store sales and historical COGS as signed minor units, leave unknown costs nullable, and upsert by tenant/reference; this preserves refunds, prevents duplicated imports, and avoids inventing margin.
- Spreadsheet uploads are archived through the existing R2StorageProvider (SigV4, live only when real STORAGE_* keys are set); this keeps Cloudflare optional until the user connects it.
- The workspace dashboard uses executive-live.js: live from the signed-in auth session + /v1/auth/session active tenant (or window.STOKROVA_API), otherwise labeled sample data.
- Every workspace area keeps its in-memory Map working set but declares it as DurableMap(<table>), which writes through to that defined table (DurableStore, no-op without DATABASE_URL; startup reload opt-in via DURABLE_HYDRATE); sales orders/invoices/payments use SalesLedgerWriter; refunds are separate REFUNDED payment rows. Why: every area persists with one pattern and tests run without a database.

- Owner workspace pages load the signed-in company's records via public/preview/workspace-live.js (PAGE_SOURCES maps page id -> API GET path; a test asserts each path exists in a controller); signed out they keep labeled sample content. Why: one loader for every page and no page can point at a missing address.
- API controllers never include 'v1/' in @Controller(); main.ts adds the global v1 prefix. Why: doubled prefixes made areas unreachable.
- The till (public/preview/pos-live.js) sells through /pos/checkout and, when offline, queues the same sale with the same idempotency key for /pos/sync; pos_sync_transactions always reloads at startup (ALWAYS_HYDRATE). Why: a sale is never lost or counted twice.
- Stokrova never processes customer money: staff record CASH or BANK_TRANSFER (CARD is normalized to BANK_TRANSFER via payments/payment-recording.ts), transfers count as CONFIRMED on entry, and /payments/takings/:sessionId gives cash-for-drawer vs transfer-for-bank per shift. Why: the business is paid directly; the app only counts.
- Plan prices live only in platform_plan_prices via PlanPricingService (billing, /billing/plans, founder console and website all read it); a business's plan is tenants.subscription_tier and the founder's tier change goes through BillingService.changePlan. Why: one price source so a founder change reaches the next invoice and the website.
- Plan subscriptions and their invoices persist as DurableMap('tenant_subscriptions'/'saas_invoices'), always reloaded at startup; BillingRenewalScheduler renews ended periods hourly at the current PlanPricingService price. Why: renewals and payment confirmations must survive restarts and bill the latest price.
- Stokrova's own plan rules (30-day trial, founder overrides FREE/DISCOUNT_PERCENT/FIXED_PRICE, access state) live in apps/api/src/billing/billing-rules.ts; BillingAccessGuard (APP_GUARD) returns 402 for a closed workspace except billing/auth/platform-admin. Why: one pure rule set decides price and access.
- What each plan includes (pages, server areas, staff/branch/till/warehouse limits) lives only in packages/domain/src/plan-catalog.ts; PlanFeatureGuard (APP_GUARD) locks server areas, create endpoints call PlanEntitlementsService.assertCanAdd, and the workspace menu intersects role pages with /billing/entitlements pages. Why: the plan a business pays for is enforced in one place for menu, server and limits.
- Owners pay plan invoices via apps/api/src/billing/invoice-checkout.ts (Paystack/Flutterwave, buttons shown only when that provider's key is set); an invoice is marked paid only after the server re-verifies the charge with the provider for the full amount and currency. Why: redirects and webhooks alone can be forged.
- Prices & margin, product profit (business-wide and per seller via staff_work_events.order_id), the manager's live board, stock in/out and delivery summaries come only from /insights/* (InsightsService + packages/domain/src/product-insights.ts) and are drawn by insights-live.js; price edits are logged in product_price_changes. Why: every figure is server-calculated and a missing cost price shows as unknown instead of an invented profit.
- Money owed, stock counts, product import/photos, reorder/ABC views and the daily email/WhatsApp summary live in apps/api/src/operations (pure rules in packages/domain/src/business-operations.ts) and are drawn by operations-live.js; a channel without its keys reports 'not set up' instead of pretending to send. Why: one place for day-to-day owner operations, never faked delivery.
- Every UI/UX design, layout change, or interface enhancement must use Google Stitch: Whenever designing, modifying, or enhancing screens, views, modals, or user workflows across the platform or website, you must call the Google Stitch MCP tools to architect, generate, or update the corresponding visual screens within the STOKROVA Stitch project (project ID: 10218250621320720849, design system: assets/13439501935648402613). Why: Every interface evolution must have authoritative visual designs in Stitch aligned with the high-industrial design system before and alongside codebase delivery.

