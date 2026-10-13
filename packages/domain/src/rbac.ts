/**
 * Scoped Dynamic RBAC Domain Engine & Invariants
 * Based on ARCHITECTURE.md, ADR-014, and Phase 1B specifications
 */

export interface ScopeTarget {
  company_id?: string;
  branch_id?: string;
  warehouse_id?: string;
  register_id?: string;
  work_center_id?: string;
}

export const StandardPermissions = {
  // Customers
  CUSTOMERS_VIEW: 'customers.view',
  CUSTOMERS_CREATE: 'customers.create',
  CUSTOMERS_UPDATE: 'customers.update',
  CUSTOMERS_MANAGE: 'customers.manage',

  // Quotations
  QUOTATIONS_CREATE: 'sales.quotation.create',
  QUOTATIONS_VIEW: 'sales.quotation.view',
  QUOTATIONS_CONVERT: 'sales.quotation.convert',

  // Sales
  SALES_ORDER_CREATE: 'sales.order.create',
  SALES_ORDER_VIEW: 'sales.order.view',
  SALES_ORDER_CANCEL: 'sales.order.cancel',
  SALES_DISCOUNT_APPLY: 'sales.discount.apply',

  // Invoices
  INVOICES_VIEW: 'sales.invoice.view',
  INVOICES_CREATE: 'sales.invoice.create',
  INVOICES_MANAGE: 'sales.invoice.manage',

  // POS
  POS_CHECKOUT: 'pos.checkout',
  POS_SYNC: 'pos.sync',
  REGISTERS_READ: 'registers:read',
  REGISTERS_OPERATE: 'registers:operate',

  // Inventory & Warehouse
  INVENTORY_VIEW: 'inventory.view',
  INVENTORY_PICK: 'inventory.pick',
  INVENTORY_VERIFY: 'inventory.verify',
  INVENTORY_ADJUST: 'inventory.adjust',
  INVENTORY_TRANSFER: 'inventory.transfer',
  WAREHOUSES_MANAGE: 'warehouses.manage',
  WAREHOUSES_VIEW: 'warehouses.view',
  RETURNS_VIEW: 'returns.view',
  RETURNS_MANAGE: 'returns.manage',
  REPLENISHMENT_VIEW: 'replenishment.view',
  REPLENISHMENT_MANAGE: 'replenishment.manage',
  DELIVERY_VIEW: 'delivery.view',
  DELIVERY_MANAGE: 'delivery.manage',

  // Registers & Payments
  REGISTER_OPEN: 'register.open',
  REGISTER_CLOSE: 'register.close',
  CASH_MOVEMENT_RECORD: 'cash.movement.record',
  PAYMENTS_COLLECT: 'payments.collect',
  PAYMENTS_REFUND: 'payments.refund',

  // Procurement & Suppliers (Phase 4)
  PURCHASES_CREATE: 'purchases.create',
  PURCHASES_RECEIVE: 'purchases.receive',
  SUPPLIERS_VIEW: 'suppliers.view',
  SUPPLIERS_CREATE: 'suppliers.create',
  SUPPLIERS_UPDATE: 'suppliers.update',
  SUPPLIERS_MANAGE: 'suppliers.manage',
  PROCUREMENT_REQUEST_CREATE: 'procurement.request.create',
  PROCUREMENT_REQUEST_VIEW: 'procurement.request.view',
  PROCUREMENT_REQUEST_SUBMIT: 'procurement.request.submit',
  PROCUREMENT_REQUEST_APPROVE: 'procurement.request.approve',
  PROCUREMENT_RFQ_CREATE: 'procurement.rfq.create',
  PROCUREMENT_RFQ_MANAGE: 'procurement.rfq.manage',
  PROCUREMENT_QUOTATION_VIEW: 'procurement.quotation.view',
  PROCUREMENT_QUOTATION_COMPARE: 'procurement.quotation.compare',
  PROCUREMENT_QUOTATION_SELECT: 'procurement.quotation.select',
  PROCUREMENT_ORDER_CREATE: 'procurement.order.create',
  PROCUREMENT_ORDER_VIEW: 'procurement.order.view',
  PROCUREMENT_ORDER_APPROVE: 'procurement.order.approve',
  PROCUREMENT_ORDER_CONFIRM: 'procurement.order.confirm',
  PROCUREMENT_ORDER_CANCEL: 'procurement.order.cancel',
  PROCUREMENT_RECEIPT_CREATE: 'procurement.receipt.create',
  PROCUREMENT_RECEIPT_INSPECT: 'procurement.receipt.inspect',
  PROCUREMENT_RECEIPT_ACCEPT: 'procurement.receipt.accept',
  PROCUREMENT_RECEIPT_POST: 'procurement.receipt.post',
  PROCUREMENT_RETURN_CREATE: 'procurement.return.create',
  PROCUREMENT_RETURN_APPROVE: 'procurement.return.approve',
  PROCUREMENT_SUPPLIER_INVOICE_VIEW: 'procurement.supplier_invoice.view',
  PROCUREMENT_SUPPLIER_INVOICE_CAPTURE: 'procurement.supplier_invoice.capture',
  PROCUREMENT_SUPPLIER_INVOICE_APPROVE: 'procurement.supplier_invoice.approve',
  PROCUREMENT_SUPPLIER_PAYMENT_VIEW: 'procurement.supplier_payment.view',
  PROCUREMENT_SUPPLIER_PAYMENT_CREATE: 'procurement.supplier_payment.create',
  PROCUREMENT_SUPPLIER_PAYMENT_APPROVE: 'procurement.supplier_payment.approve',

  // Manufacturing (Phase 5)
  MANUFACTURING_BOM_VIEW: 'manufacturing.bom.view',
  MANUFACTURING_BOM_CREATE: 'manufacturing.bom.create',
  MANUFACTURING_BOM_UPDATE: 'manufacturing.bom.update',
  MANUFACTURING_BOM_APPROVE: 'manufacturing.bom.approve',
  MANUFACTURING_ORDER_VIEW: 'manufacturing.order.view',
  MANUFACTURING_ORDER_CREATE: 'manufacturing.order.create',
  MANUFACTURING_ORDER_PLAN: 'manufacturing.order.plan',
  MANUFACTURING_ORDER_RELEASE: 'manufacturing.order.release',
  MANUFACTURING_ORDER_CANCEL: 'manufacturing.order.cancel',
  MANUFACTURING_MATERIAL_RESERVE: 'manufacturing.material.reserve',
  MANUFACTURING_MATERIAL_ISSUE: 'manufacturing.material.issue',
  MANUFACTURING_MATERIAL_CONSUME: 'manufacturing.material.consume',
  MANUFACTURING_MATERIAL_RETURN: 'manufacturing.material.return',
  MANUFACTURING_OPERATION_START: 'manufacturing.operation.start',
  MANUFACTURING_OPERATION_COMPLETE: 'manufacturing.operation.complete',
  MANUFACTURING_OUTPUT_RECORD: 'manufacturing.output.record',
  MANUFACTURING_OUTPUT_INSPECT: 'manufacturing.output.inspect',
  MANUFACTURING_OUTPUT_ACCEPT: 'manufacturing.output.accept',
  MANUFACTURING_OUTPUT_POST: 'manufacturing.output.post',
  MANUFACTURING_SCRAP_RECORD: 'manufacturing.scrap.record',
  MANUFACTURING_SCRAP_APPROVE: 'manufacturing.scrap.approve',
  MANUFACTURING_COST_VIEW: 'manufacturing.cost.view',
  MANUFACTURING_TRACEABILITY_VIEW: 'manufacturing.traceability.view',

  // Finance & Accounting (Phase 6)
  FINANCE_VIEW: 'finance.view',
  FINANCE_JOURNAL_POST: 'finance.journal.post',
  ACCOUNTING_BOOKS_VIEW: 'accounting.books.view',
  ACCOUNTING_BOOKS_MANAGE: 'accounting.books.manage',
  ACCOUNTING_ACCOUNTS_VIEW: 'accounting.accounts.view',
  ACCOUNTING_ACCOUNTS_MANAGE: 'accounting.accounts.manage',
  ACCOUNTING_PERIODS_VIEW: 'accounting.periods.view',
  ACCOUNTING_PERIODS_MANAGE: 'accounting.periods.manage',
  ACCOUNTING_PERIODS_CLOSE: 'accounting.periods.close',
  ACCOUNTING_PERIODS_REOPEN: 'accounting.periods.reopen',
  ACCOUNTING_JOURNALS_VIEW: 'accounting.journals.view',
  ACCOUNTING_JOURNALS_CREATE: 'accounting.journals.create',
  ACCOUNTING_JOURNALS_VALIDATE: 'accounting.journals.validate',
  ACCOUNTING_JOURNALS_POST: 'accounting.journals.post',
  ACCOUNTING_JOURNALS_REVERSE: 'accounting.journals.reverse',
  ACCOUNTING_POSTING_RULES_VIEW: 'accounting.posting_rules.view',
  ACCOUNTING_POSTING_RULES_MANAGE: 'accounting.posting_rules.manage',
  ACCOUNTING_REPORTS_VIEW: 'accounting.reports.view',
  ACCOUNTING_RECONCILIATION_VIEW: 'accounting.reconciliation.view',
  ACCOUNTING_RECONCILIATION_MANAGE: 'accounting.reconciliation.manage',
  ACCOUNTING_AUDIT_VIEW: 'accounting.audit.view',

  // Phase 7: Multi-Entity Consolidation & Intercompany
  CONSOLIDATION_VIEW: 'consolidation.view',
  CONSOLIDATION_MANAGE: 'consolidation.manage',
  CONSOLIDATION_EXECUTE: 'consolidation.execute',
  CONSOLIDATION_FINALIZE: 'consolidation.finalize',
  INTERCOMPANY_VIEW: 'intercompany.view',
  INTERCOMPANY_MANAGE: 'intercompany.manage',
  INTERCOMPANY_MATCH: 'intercompany.match',
  INTERCOMPANY_ELIMINATE: 'intercompany.eliminate',

  // Phase 7: Advanced Treasury
  TREASURY_VIEW: 'treasury.view',
  TREASURY_MANAGE: 'treasury.manage',
  TREASURY_TRANSFER_INITIATE: 'treasury.transfer.initiate',
  TREASURY_TRANSFER_APPROVE: 'treasury.transfer.approve',
  TREASURY_TRANSFER_SETTLE: 'treasury.transfer.settle',
  TREASURY_SYNC_BANK: 'treasury.sync.bank',
  TREASURY_FORECAST: 'treasury.forecast',

  // Phase 7: Tax Compliance
  TAX_VIEW: 'tax.view',
  TAX_MANAGE: 'tax.manage',
  TAX_PREPARE: 'tax.prepare',
  TAX_APPROVE: 'tax.approve',
  TAX_SUBMIT: 'tax.submit',

  // Phase 8: Advanced Pricing, Promotions, Loyalty & Rebates
  PRICING_CONTRACTS_MANAGE: 'pricing.contracts.manage',
  PRICING_MARGIN_OVERRIDE: 'pricing.margin.override',
  PRICING_MARGIN_APPROVE: 'pricing.margin.approve',
  PROMOTIONS_CAMPAIGN_MANAGE: 'promotions.campaign.manage',
  PROMOTIONS_REDEEM: 'promotions.redeem',
  LOYALTY_PROGRAM_MANAGE: 'loyalty.program.manage',
  LOYALTY_POINTS_ADJUST: 'loyalty.points.adjust',
  REBATES_AGREEMENT_MANAGE: 'rebates.agreement.manage',
  REBATES_ACCRUAL_CALCULATE: 'rebates.accrual.calculate',
  REBATES_CLAIM_APPROVE: 'rebates.claim.approve',
  REBATES_SETTLE: 'rebates.settle',

  // Phase 9: CRM, Marketing Automation & Customer Engagement
  CRM_CUSTOMER_VIEW: 'crm.customer.view',
  CRM_CUSTOMER_MANAGE: 'crm.customer.manage',
  CRM_CUSTOMER_MERGE: 'crm.customer.merge',
  CRM_CONTACT_MANAGE: 'crm.contact.manage',
  CRM_LEAD_VIEW: 'crm.lead.view',
  CRM_LEAD_MANAGE: 'crm.lead.manage',
  CRM_LEAD_CONVERT: 'crm.lead.convert',
  CRM_OPPORTUNITY_VIEW: 'crm.opportunity.view',
  CRM_OPPORTUNITY_MANAGE: 'crm.opportunity.manage',
  CRM_PIPELINE_MANAGE: 'crm.pipeline.manage',
  CRM_ACTIVITY_VIEW: 'crm.activity.view',
  CRM_ACTIVITY_MANAGE: 'crm.activity.manage',
  CRM_SEGMENT_VIEW: 'crm.segment.view',
  CRM_SEGMENT_MANAGE: 'crm.segment.manage',
  CRM_CAMPAIGN_VIEW: 'crm.campaign.view',
  CRM_CAMPAIGN_MANAGE: 'crm.campaign.manage',
  CRM_CAMPAIGN_APPROVE: 'crm.campaign.approve',
  CRM_CAMPAIGN_DISPATCH: 'crm.campaign.dispatch',
  CRM_AUTOMATION_MANAGE: 'crm.automation.manage',
  CRM_AUTOMATION_PUBLISH: 'crm.automation.publish',
  CRM_CONSENT_VIEW: 'crm.consent.view',
  CRM_CONSENT_MANAGE: 'crm.consent.manage',
  CRM_ANALYTICS_VIEW: 'crm.analytics.view',

  // Logistics & Fulfillment (Phase 10)
  LOGISTICS_FULFILLMENT_VIEW: 'logistics.fulfillment.view',
  LOGISTICS_FULFILLMENT_MANAGE: 'logistics.fulfillment.manage',
  LOGISTICS_SHIPMENT_VIEW: 'logistics.shipment.view',
  LOGISTICS_SHIPMENT_MANAGE: 'logistics.shipment.manage',
  LOGISTICS_SHIPMENT_DISPATCH: 'logistics.shipment.dispatch',
  LOGISTICS_CARRIER_MANAGE: 'logistics.carrier.manage',
  LOGISTICS_DELIVERY_RUN_VIEW: 'logistics.delivery_run.view',
  LOGISTICS_DELIVERY_RUN_MANAGE: 'logistics.delivery_run.manage',
  LOGISTICS_DELIVERY_RUN_DISPATCH: 'logistics.delivery_run.dispatch',
  LOGISTICS_DELIVERY_ASSIGN: 'logistics.delivery.assign',
  LOGISTICS_DELIVERY_EXECUTE: 'logistics.delivery.execute',
  LOGISTICS_POD_VIEW: 'logistics.pod.view',
  LOGISTICS_POD_RECORD: 'logistics.pod.record',
  LOGISTICS_REVERSE_MANAGE: 'logistics.reverse.manage',
  LOGISTICS_COST_VIEW: 'logistics.cost.view',
  LOGISTICS_COST_MANAGE: 'logistics.cost.manage',
  LOGISTICS_POLICY_MANAGE: 'logistics.policy.manage',

  // Administration
  CATALOG_VIEW: 'catalog.view',
  CATALOG_MANAGE: 'catalog.manage',
  BRANCHES_MANAGE: 'branches.manage',
  WORK_CENTERS_MANAGE: 'work_centers.manage',
  REGISTERS_MANAGE: 'registers.manage',
  STAFF_MANAGE: 'staff.manage',
  ROLES_MANAGE: 'roles.manage',
  WORKFLOWS_MANAGE: 'workflows.manage',
  APPROVALS_MANAGE: 'approvals.manage',
  AUDIT_VIEW: 'audit.view',
  DEVICES_MANAGE: 'devices.manage',
  SYNC_PUSH: 'sync.push',
  SYNC_PULL: 'sync.pull',
  ANALYTICS_VIEW: 'analytics.view',
  ANALYTICS_RUN: 'analytics.run',

  // Enterprise Reporting & Analytics (Phase 11)
  REPORTING_DASHBOARD_VIEW: 'reporting.dashboard.view',
  REPORTING_DASHBOARD_MANAGE: 'reporting.dashboard.manage',
  REPORTING_REPORT_VIEW: 'reporting.report.view',
  REPORTING_REPORT_CREATE: 'reporting.report.create',
  REPORTING_REPORT_MANAGE: 'reporting.report.manage',
  REPORTING_REPORT_SCHEDULE: 'reporting.report.schedule',
  REPORTING_REPORT_EXPORT: 'reporting.report.export',
  REPORTING_FINANCIAL_VIEW: 'reporting.financial.view',
  REPORTING_PROJECTION_REBUILD: 'reporting.projection.rebuild',
} as const;


export type StandardPermissionCode =
  (typeof StandardPermissions)[keyof typeof StandardPermissions];

export interface SystemRoleTemplate {
  name: string;
  code: string;
  description: string;
  permissions: string[];
}

export const SystemRoleTemplates: Record<string, SystemRoleTemplate> = {
  BUSINESS_OWNER: {
    name: 'Business Owner',
    code: 'BUSINESS_OWNER',
    description: 'Full administrative access across all tenant operations',
    permissions: Object.values(StandardPermissions),
  },
  BRANCH_MANAGER: {
    name: 'Branch Manager',
    code: 'BRANCH_MANAGER',
    description: 'Operational manager with branch-level authority over sales, inventory, and staff',
    permissions: [
      StandardPermissions.SALES_ORDER_CREATE,
      StandardPermissions.SALES_ORDER_VIEW,
      StandardPermissions.SALES_ORDER_CANCEL,
      StandardPermissions.SALES_DISCOUNT_APPLY,
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.INVENTORY_ADJUST,
      StandardPermissions.INVENTORY_TRANSFER,
      StandardPermissions.REGISTER_OPEN,
      StandardPermissions.REGISTER_CLOSE,
      StandardPermissions.CASH_MOVEMENT_RECORD,
      StandardPermissions.PAYMENTS_COLLECT,
      StandardPermissions.BRANCHES_MANAGE,
      StandardPermissions.WAREHOUSES_MANAGE,
      StandardPermissions.WAREHOUSES_VIEW,
      StandardPermissions.WORK_CENTERS_MANAGE,
      StandardPermissions.REGISTERS_MANAGE,
      StandardPermissions.APPROVALS_MANAGE,
      StandardPermissions.STAFF_MANAGE,
      StandardPermissions.CATALOG_MANAGE,
      StandardPermissions.CATALOG_VIEW,
    ],
  },
  SALES_CLERK: {
    name: 'Sales Clerk',
    code: 'SALES_CLERK',
    description: 'Customer-facing sales representative creating customer orders',
    permissions: [
      StandardPermissions.SALES_ORDER_CREATE,
      StandardPermissions.SALES_ORDER_VIEW,
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.CATALOG_VIEW,
    ],
  },
  WAREHOUSE_PICKER: {
    name: 'Warehouse Picker',
    code: 'WAREHOUSE_PICKER',
    description: 'Warehouse staff retrieving goods from physical storage bins',
    permissions: [
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.INVENTORY_PICK,
      StandardPermissions.WAREHOUSES_VIEW,
      StandardPermissions.CATALOG_VIEW,
    ],
  },
  WAREHOUSE_CHECKER: {
    name: 'Warehouse Checker',
    code: 'WAREHOUSE_CHECKER',
    description: 'Independent inspector verifying picked orders prior to dispatch/payment',
    permissions: [
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.INVENTORY_VERIFY,
      StandardPermissions.WAREHOUSES_VIEW,
      StandardPermissions.CATALOG_VIEW,
    ],
  },
  CASHIER: {
    name: 'Cashier',
    code: 'CASHIER',
    description: 'Checkout till operator collecting customer payments and balancing registers',
    permissions: [
      StandardPermissions.SALES_ORDER_VIEW,
      StandardPermissions.REGISTER_OPEN,
      StandardPermissions.REGISTER_CLOSE,
      StandardPermissions.CASH_MOVEMENT_RECORD,
      StandardPermissions.PAYMENTS_COLLECT,
      StandardPermissions.CATALOG_VIEW,
    ],
  },
  INVENTORY_CONTROLLER: {
    name: 'Inventory Controller',
    code: 'INVENTORY_CONTROLLER',
    description: 'Auditor managing stock counts, adjustments, and receiving',
    permissions: [
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.INVENTORY_ADJUST,
      StandardPermissions.INVENTORY_TRANSFER,
      StandardPermissions.WAREHOUSES_MANAGE,
      StandardPermissions.WAREHOUSES_VIEW,
      StandardPermissions.PURCHASES_RECEIVE,
      StandardPermissions.CATALOG_MANAGE,
      StandardPermissions.CATALOG_VIEW,
    ],
  },
  ACCOUNTANT: {
    name: 'Accountant',
    code: 'ACCOUNTANT',
    description: 'Finance officer managing ledgers, expenses, and payments',
    permissions: [
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.FINANCE_JOURNAL_POST,
      StandardPermissions.PAYMENTS_COLLECT,
      StandardPermissions.PAYMENTS_REFUND,
      StandardPermissions.CATALOG_VIEW,
    ],
  },
  AUDITOR: {
    name: 'Auditor',
    code: 'AUDITOR',
    description: 'Read-only compliance officer inspecting historical logs and journals',
    permissions: [
      StandardPermissions.SALES_ORDER_VIEW,
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.CATALOG_VIEW,
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.AUDIT_VIEW,
      StandardPermissions.MANUFACTURING_ORDER_VIEW,
      StandardPermissions.MANUFACTURING_COST_VIEW,
      StandardPermissions.MANUFACTURING_TRACEABILITY_VIEW,
    ],
  },
  PRODUCTION_MANAGER: {
    name: 'Production Manager',
    code: 'PRODUCTION_MANAGER',
    description: 'Plant supervisor with authority to manage BOMs, release production orders, and inspect yields',
    permissions: [
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.CATALOG_VIEW,
      StandardPermissions.WORK_CENTERS_MANAGE,
      StandardPermissions.MANUFACTURING_BOM_VIEW,
      StandardPermissions.MANUFACTURING_BOM_CREATE,
      StandardPermissions.MANUFACTURING_BOM_UPDATE,
      StandardPermissions.MANUFACTURING_BOM_APPROVE,
      StandardPermissions.MANUFACTURING_ORDER_VIEW,
      StandardPermissions.MANUFACTURING_ORDER_CREATE,
      StandardPermissions.MANUFACTURING_ORDER_PLAN,
      StandardPermissions.MANUFACTURING_ORDER_RELEASE,
      StandardPermissions.MANUFACTURING_ORDER_CANCEL,
      StandardPermissions.MANUFACTURING_MATERIAL_RESERVE,
      StandardPermissions.MANUFACTURING_MATERIAL_ISSUE,
      StandardPermissions.MANUFACTURING_MATERIAL_CONSUME,
      StandardPermissions.MANUFACTURING_MATERIAL_RETURN,
      StandardPermissions.MANUFACTURING_OPERATION_START,
      StandardPermissions.MANUFACTURING_OPERATION_COMPLETE,
      StandardPermissions.MANUFACTURING_OUTPUT_RECORD,
      StandardPermissions.MANUFACTURING_OUTPUT_INSPECT,
      StandardPermissions.MANUFACTURING_OUTPUT_ACCEPT,
      StandardPermissions.MANUFACTURING_OUTPUT_POST,
      StandardPermissions.MANUFACTURING_SCRAP_RECORD,
      StandardPermissions.MANUFACTURING_SCRAP_APPROVE,
      StandardPermissions.MANUFACTURING_COST_VIEW,
      StandardPermissions.MANUFACTURING_TRACEABILITY_VIEW,
    ],
  },
  PRODUCTION_OPERATOR: {
    name: 'Production Operator',
    code: 'PRODUCTION_OPERATOR',
    description: 'Shop floor worker executing operations, consuming materials, and recording yields',
    permissions: [
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.CATALOG_VIEW,
      StandardPermissions.MANUFACTURING_ORDER_VIEW,
      StandardPermissions.MANUFACTURING_MATERIAL_CONSUME,
      StandardPermissions.MANUFACTURING_OPERATION_START,
      StandardPermissions.MANUFACTURING_OPERATION_COMPLETE,
      StandardPermissions.MANUFACTURING_OUTPUT_RECORD,
      StandardPermissions.MANUFACTURING_SCRAP_RECORD,
    ],
  },
  FINANCIAL_CONTROLLER: {
    name: 'Financial Controller',
    code: 'FINANCIAL_CONTROLLER',
    description: 'Chief accounting officer managing books, period close, charts of accounts, and fiscal compliance',
    permissions: [
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.FINANCE_JOURNAL_POST,
      StandardPermissions.ACCOUNTING_BOOKS_VIEW,
      StandardPermissions.ACCOUNTING_BOOKS_MANAGE,
      StandardPermissions.ACCOUNTING_ACCOUNTS_VIEW,
      StandardPermissions.ACCOUNTING_ACCOUNTS_MANAGE,
      StandardPermissions.ACCOUNTING_PERIODS_VIEW,
      StandardPermissions.ACCOUNTING_PERIODS_MANAGE,
      StandardPermissions.ACCOUNTING_PERIODS_CLOSE,
      StandardPermissions.ACCOUNTING_PERIODS_REOPEN,
      StandardPermissions.ACCOUNTING_JOURNALS_VIEW,
      StandardPermissions.ACCOUNTING_JOURNALS_CREATE,
      StandardPermissions.ACCOUNTING_JOURNALS_VALIDATE,
      StandardPermissions.ACCOUNTING_JOURNALS_POST,
      StandardPermissions.ACCOUNTING_JOURNALS_REVERSE,
      StandardPermissions.ACCOUNTING_POSTING_RULES_VIEW,
      StandardPermissions.ACCOUNTING_POSTING_RULES_MANAGE,
      StandardPermissions.ACCOUNTING_REPORTS_VIEW,
      StandardPermissions.ACCOUNTING_RECONCILIATION_VIEW,
      StandardPermissions.ACCOUNTING_RECONCILIATION_MANAGE,
      StandardPermissions.ACCOUNTING_AUDIT_VIEW,
      StandardPermissions.AUDIT_VIEW,
    ],
  },
  GENERAL_ACCOUNTANT: {
    name: 'General Accountant',
    code: 'GENERAL_ACCOUNTANT',
    description: 'Accountant preparing journal entries, reviewing ledgers, and running financial reports',
    permissions: [
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.FINANCE_JOURNAL_POST,
      StandardPermissions.ACCOUNTING_BOOKS_VIEW,
      StandardPermissions.ACCOUNTING_ACCOUNTS_VIEW,
      StandardPermissions.ACCOUNTING_PERIODS_VIEW,
      StandardPermissions.ACCOUNTING_JOURNALS_VIEW,
      StandardPermissions.ACCOUNTING_JOURNALS_CREATE,
      StandardPermissions.ACCOUNTING_JOURNALS_VALIDATE,
      StandardPermissions.ACCOUNTING_JOURNALS_POST,
      StandardPermissions.ACCOUNTING_REPORTS_VIEW,
      StandardPermissions.ACCOUNTING_RECONCILIATION_VIEW,
    ],
  },
  GROUP_CONTROLLER: {
    name: 'Group Financial Controller',
    code: 'GROUP_CONTROLLER',
    description: 'Corporate controller managing multi-entity consolidation, intercompany eliminations, and group reports',
    permissions: [
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.CONSOLIDATION_VIEW,
      StandardPermissions.CONSOLIDATION_MANAGE,
      StandardPermissions.CONSOLIDATION_EXECUTE,
      StandardPermissions.CONSOLIDATION_FINALIZE,
      StandardPermissions.INTERCOMPANY_VIEW,
      StandardPermissions.INTERCOMPANY_MANAGE,
      StandardPermissions.INTERCOMPANY_MATCH,
      StandardPermissions.INTERCOMPANY_ELIMINATE,
      StandardPermissions.ACCOUNTING_REPORTS_VIEW,
    ],
  },
  TREASURY_MANAGER: {
    name: 'Treasury Manager',
    code: 'TREASURY_MANAGER',
    description: 'Treasury manager managing corporate bank accounts, cash transfers, feeds, and cash forecasting',
    permissions: [
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.TREASURY_VIEW,
      StandardPermissions.TREASURY_MANAGE,
      StandardPermissions.TREASURY_TRANSFER_INITIATE,
      StandardPermissions.TREASURY_TRANSFER_APPROVE,
      StandardPermissions.TREASURY_TRANSFER_SETTLE,
      StandardPermissions.TREASURY_SYNC_BANK,
      StandardPermissions.TREASURY_FORECAST,
    ],
  },
  TAX_MANAGER: {
    name: 'Tax Compliance Manager',
    code: 'TAX_MANAGER',
    description: 'Tax manager handling tax registrations, return preparation, reconciliation, and filing submissions',
    permissions: [
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.TAX_VIEW,
      StandardPermissions.TAX_MANAGE,
      StandardPermissions.TAX_PREPARE,
      StandardPermissions.TAX_APPROVE,
      StandardPermissions.TAX_SUBMIT,
      StandardPermissions.ACCOUNTING_REPORTS_VIEW,
    ],
  },
  PRICING_MANAGER: {
    name: 'Pricing & Promotions Manager',
    code: 'PRICING_MANAGER',
    description: 'Commercial manager configuring price lists, contracts, volume breaks, and promotional campaigns',
    permissions: [
      StandardPermissions.CATALOG_VIEW,
      StandardPermissions.PRICING_CONTRACTS_MANAGE,
      StandardPermissions.PRICING_MARGIN_OVERRIDE,
      StandardPermissions.PROMOTIONS_CAMPAIGN_MANAGE,
      StandardPermissions.PROMOTIONS_REDEEM,
    ],
  },
  COMMERCIAL_CONTROLLER: {
    name: 'Commercial Controller',
    code: 'COMMERCIAL_CONTROLLER',
    description: 'Controller governing margin floor policies, approving price overrides, and managing customer/supplier rebates',
    permissions: [
      StandardPermissions.FINANCE_VIEW,
      StandardPermissions.CATALOG_VIEW,
      StandardPermissions.PRICING_MARGIN_OVERRIDE,
      StandardPermissions.PRICING_MARGIN_APPROVE,
      StandardPermissions.REBATES_AGREEMENT_MANAGE,
      StandardPermissions.REBATES_ACCRUAL_CALCULATE,
      StandardPermissions.REBATES_CLAIM_APPROVE,
      StandardPermissions.REBATES_SETTLE,
    ],
  },
  LOYALTY_PROGRAM_MANAGER: {
    name: 'Loyalty Program Manager',
    code: 'LOYALTY_PROGRAM_MANAGER',
    description: 'Manager administering loyalty programs, reward tiers, point rules, and customer point adjustments',
    permissions: [
      StandardPermissions.LOYALTY_PROGRAM_MANAGE,
      StandardPermissions.LOYALTY_POINTS_ADJUST,
      StandardPermissions.CUSTOMERS_VIEW,
    ],
  },
  SALES_REPRESENTATIVE: {
    name: 'Sales Representative',
    code: 'SALES_REPRESENTATIVE',
    description: 'Sales team member managing leads, customer relationships, opportunities, and activities',
    permissions: [
      StandardPermissions.CUSTOMERS_VIEW,
      StandardPermissions.CRM_CUSTOMER_VIEW,
      StandardPermissions.CRM_LEAD_VIEW,
      StandardPermissions.CRM_LEAD_MANAGE,
      StandardPermissions.CRM_LEAD_CONVERT,
      StandardPermissions.CRM_OPPORTUNITY_VIEW,
      StandardPermissions.CRM_OPPORTUNITY_MANAGE,
      StandardPermissions.CRM_ACTIVITY_VIEW,
      StandardPermissions.CRM_ACTIVITY_MANAGE,
      StandardPermissions.SALES_ORDER_CREATE,
      StandardPermissions.SALES_ORDER_VIEW,
    ],
  },
  SALES_MANAGER: {
    name: 'Sales Manager',
    code: 'SALES_MANAGER',
    description: 'Sales leadership overseeing pipelines, team quotas, customer merges, and conversions',
    permissions: [
      StandardPermissions.CUSTOMERS_VIEW,
      StandardPermissions.CRM_CUSTOMER_VIEW,
      StandardPermissions.CRM_CUSTOMER_MANAGE,
      StandardPermissions.CRM_CUSTOMER_MERGE,
      StandardPermissions.CRM_CONTACT_MANAGE,
      StandardPermissions.CRM_LEAD_VIEW,
      StandardPermissions.CRM_LEAD_MANAGE,
      StandardPermissions.CRM_LEAD_CONVERT,
      StandardPermissions.CRM_OPPORTUNITY_VIEW,
      StandardPermissions.CRM_OPPORTUNITY_MANAGE,
      StandardPermissions.CRM_PIPELINE_MANAGE,
      StandardPermissions.CRM_ACTIVITY_VIEW,
      StandardPermissions.CRM_ACTIVITY_MANAGE,
      StandardPermissions.CRM_ANALYTICS_VIEW,
      StandardPermissions.SALES_ORDER_CREATE,
      StandardPermissions.SALES_ORDER_VIEW,
    ],
  },
  MARKETING_SPECIALIST: {
    name: 'Marketing Specialist',
    code: 'MARKETING_SPECIALIST',
    description: 'Marketing professional managing audience segments, campaigns, and consent records',
    permissions: [
      StandardPermissions.CUSTOMERS_VIEW,
      StandardPermissions.CRM_CUSTOMER_VIEW,
      StandardPermissions.CRM_SEGMENT_VIEW,
      StandardPermissions.CRM_SEGMENT_MANAGE,
      StandardPermissions.CRM_CAMPAIGN_VIEW,
      StandardPermissions.CRM_CAMPAIGN_MANAGE,
      StandardPermissions.CRM_CONSENT_VIEW,
      StandardPermissions.CRM_CONSENT_MANAGE,
      StandardPermissions.CRM_AUTOMATION_MANAGE,
      StandardPermissions.CRM_ANALYTICS_VIEW,
    ],
  },
  CRM_ADMINISTRATOR: {
    name: 'CRM Administrator',
    code: 'CRM_ADMINISTRATOR',
    description: 'Full administrative control over all CRM pipelines, marketing automations, and approvals',
    permissions: [
      StandardPermissions.CUSTOMERS_VIEW,
      StandardPermissions.CRM_CUSTOMER_VIEW,
      StandardPermissions.CRM_CUSTOMER_MANAGE,
      StandardPermissions.CRM_CUSTOMER_MERGE,
      StandardPermissions.CRM_CONTACT_MANAGE,
      StandardPermissions.CRM_LEAD_VIEW,
      StandardPermissions.CRM_LEAD_MANAGE,
      StandardPermissions.CRM_LEAD_CONVERT,
      StandardPermissions.CRM_OPPORTUNITY_VIEW,
      StandardPermissions.CRM_OPPORTUNITY_MANAGE,
      StandardPermissions.CRM_PIPELINE_MANAGE,
      StandardPermissions.CRM_ACTIVITY_VIEW,
      StandardPermissions.CRM_ACTIVITY_MANAGE,
      StandardPermissions.CRM_SEGMENT_VIEW,
      StandardPermissions.CRM_SEGMENT_MANAGE,
      StandardPermissions.CRM_CAMPAIGN_VIEW,
      StandardPermissions.CRM_CAMPAIGN_MANAGE,
      StandardPermissions.CRM_CAMPAIGN_APPROVE,
      StandardPermissions.CRM_CAMPAIGN_DISPATCH,
      StandardPermissions.CRM_AUTOMATION_MANAGE,
      StandardPermissions.CRM_AUTOMATION_PUBLISH,
      StandardPermissions.CRM_CONSENT_VIEW,
      StandardPermissions.CRM_CONSENT_MANAGE,
      StandardPermissions.CRM_ANALYTICS_VIEW,
      StandardPermissions.AUDIT_VIEW,
    ],
  },
  WAREHOUSE_DISPATCHER: {
    name: 'Warehouse Dispatcher',
    code: 'WAREHOUSE_DISPATCHER',
    description: 'Fulfillment allocation, packing, manifest generation, and shipment dispatch',
    permissions: [
      StandardPermissions.LOGISTICS_FULFILLMENT_VIEW,
      StandardPermissions.LOGISTICS_FULFILLMENT_MANAGE,
      StandardPermissions.LOGISTICS_SHIPMENT_VIEW,
      StandardPermissions.LOGISTICS_SHIPMENT_MANAGE,
      StandardPermissions.LOGISTICS_SHIPMENT_DISPATCH,
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.INVENTORY_PICK,
      StandardPermissions.WAREHOUSES_VIEW,
    ],
  },
  DELIVERY_DRIVER: {
    name: 'Delivery Driver',
    code: 'DELIVERY_DRIVER',
    description: 'Viewing assigned delivery runs, stop navigation, delivery execution, and POD recording',
    permissions: [
      StandardPermissions.LOGISTICS_DELIVERY_RUN_VIEW,
      StandardPermissions.LOGISTICS_DELIVERY_EXECUTE,
      StandardPermissions.LOGISTICS_POD_VIEW,
      StandardPermissions.LOGISTICS_POD_RECORD,
      StandardPermissions.LOGISTICS_SHIPMENT_VIEW,
    ],
  },
  LOGISTICS_MANAGER: {
    name: 'Logistics Manager',
    code: 'LOGISTICS_MANAGER',
    description: 'Comprehensive authority over fulfillment, carriers, routes, reverse logistics, and logistics costs',
    permissions: [
      StandardPermissions.LOGISTICS_FULFILLMENT_VIEW,
      StandardPermissions.LOGISTICS_FULFILLMENT_MANAGE,
      StandardPermissions.LOGISTICS_SHIPMENT_VIEW,
      StandardPermissions.LOGISTICS_SHIPMENT_MANAGE,
      StandardPermissions.LOGISTICS_SHIPMENT_DISPATCH,
      StandardPermissions.LOGISTICS_CARRIER_MANAGE,
      StandardPermissions.LOGISTICS_DELIVERY_RUN_VIEW,
      StandardPermissions.LOGISTICS_DELIVERY_RUN_MANAGE,
      StandardPermissions.LOGISTICS_DELIVERY_RUN_DISPATCH,
      StandardPermissions.LOGISTICS_DELIVERY_ASSIGN,
      StandardPermissions.LOGISTICS_DELIVERY_EXECUTE,
      StandardPermissions.LOGISTICS_POD_VIEW,
      StandardPermissions.LOGISTICS_POD_RECORD,
      StandardPermissions.LOGISTICS_REVERSE_MANAGE,
      StandardPermissions.LOGISTICS_COST_VIEW,
      StandardPermissions.LOGISTICS_COST_MANAGE,
      StandardPermissions.LOGISTICS_POLICY_MANAGE,
      StandardPermissions.INVENTORY_VIEW,
      StandardPermissions.WAREHOUSES_VIEW,
    ],
  },
  REPORTING_ANALYST: {
    name: 'Reporting Analyst',
    code: 'REPORTING_ANALYST',
    description: 'Creation, configuration, scheduling, and export of operational and business intelligence reports',
    permissions: [
      StandardPermissions.REPORTING_DASHBOARD_VIEW,
      StandardPermissions.REPORTING_DASHBOARD_MANAGE,
      StandardPermissions.REPORTING_REPORT_VIEW,
      StandardPermissions.REPORTING_REPORT_CREATE,
      StandardPermissions.REPORTING_REPORT_MANAGE,
      StandardPermissions.REPORTING_REPORT_SCHEDULE,
      StandardPermissions.REPORTING_REPORT_EXPORT,
      StandardPermissions.ANALYTICS_VIEW,
      StandardPermissions.ANALYTICS_RUN,
    ],
  },
  FINANCIAL_AUDITOR: {
    name: 'Financial Auditor',
    code: 'FINANCIAL_AUDITOR',
    description: 'Read-only access to General Ledger, financial statements, reconciliation audits, and compliance exports',
    permissions: [
      StandardPermissions.REPORTING_DASHBOARD_VIEW,
      StandardPermissions.REPORTING_REPORT_VIEW,
      StandardPermissions.REPORTING_FINANCIAL_VIEW,
      StandardPermissions.REPORTING_REPORT_EXPORT,
      StandardPermissions.ACCOUNTING_JOURNALS_VIEW,
      StandardPermissions.ACCOUNTING_PERIODS_VIEW,
      StandardPermissions.ACCOUNTING_ACCOUNTS_VIEW,
      StandardPermissions.AUDIT_VIEW,
    ],
  },
  EXECUTIVE_VIEWER: {
    name: 'Executive Viewer',
    code: 'EXECUTIVE_VIEWER',
    description: 'High-level business intelligence dashboards, KPI cards, and cross-branch performance summaries',
    permissions: [
      StandardPermissions.REPORTING_DASHBOARD_VIEW,
      StandardPermissions.REPORTING_REPORT_VIEW,
      StandardPermissions.REPORTING_REPORT_EXPORT,
      StandardPermissions.ANALYTICS_VIEW,
    ],
  },
};

export interface ActiveRoleAssignment {
  role_code: string;
  permissions: string[];
  scope: ScopeTarget;
}

/**
 * Evaluates whether a set of user role assignments grants a required permission
 * within the requested target scope.
 */
export function evaluatePermissionScope(
  assignments: ActiveRoleAssignment[],
  requiredPermission: string,
  targetScope?: ScopeTarget,
): boolean {
  for (const assignment of assignments) {
    // 1. Check if assignment includes permission (or wildcard '*')
    const hasPermission =
      assignment.permissions.includes('*') ||
      assignment.permissions.includes(requiredPermission);

    if (!hasPermission) {
      continue;
    }

    // 2. Check scope alignment
    const scope = assignment.scope || {};

    // If assignment has no scope boundaries, it grants tenant-wide global access
    const isGlobalAssignment =
      !scope.company_id &&
      !scope.branch_id &&
      !scope.warehouse_id &&
      !scope.register_id &&
      !scope.work_center_id;

    if (isGlobalAssignment) {
      return true;
    }

    // If targetScope requires a specific branch, and assignment restricts to a branch:
    if (scope.branch_id && targetScope?.branch_id && scope.branch_id !== targetScope.branch_id) {
      continue;
    }

    // If targetScope requires a specific register, and assignment restricts to a register:
    if (scope.register_id && targetScope?.register_id && scope.register_id !== targetScope.register_id) {
      continue;
    }

    // If targetScope requires a specific work center, and assignment restricts to a work center:
    if (scope.work_center_id && targetScope?.work_center_id && scope.work_center_id !== targetScope.work_center_id) {
      continue;
    }

    // If targetScope requires a specific warehouse, and assignment restricts to a warehouse:
    if (scope.warehouse_id && targetScope?.warehouse_id && scope.warehouse_id !== targetScope.warehouse_id) {
      continue;
    }

    return true;
  }

  return false;
}
