import { Module } from '@nestjs/common';
import { AccountsService } from './accounts.service.js';
import { GeneralLedgerService } from './general-ledger.service.js';
import { FinancialReportsService } from './financial-reports.service.js';
import { AccountingBooksService } from './accounting-books.service.js';
import { PostingRulesService } from './posting-rules.service.js';
import { PostingEngineService } from './posting-engine.service.js';
import { ReconciliationService } from './reconciliation.service.js';
import { FinanceController } from './finance.controller.js';

import { ConsolidationService } from './consolidation.service.js';
import { IntercompanyService } from './intercompany.service.js';
import { TreasuryService } from './treasury.service.js';
import { TaxComplianceService } from './tax-compliance.service.js';

@Module({
  controllers: [FinanceController],
  providers: [
    AccountsService,
    GeneralLedgerService,
    FinancialReportsService,
    AccountingBooksService,
    PostingRulesService,
    PostingEngineService,
    ReconciliationService,
    IntercompanyService,
    ConsolidationService,
    TreasuryService,
    TaxComplianceService,
  ],
  exports: [
    AccountsService,
    GeneralLedgerService,
    FinancialReportsService,
    AccountingBooksService,
    PostingRulesService,
    PostingEngineService,
    ReconciliationService,
    IntercompanyService,
    ConsolidationService,
    TreasuryService,
    TaxComplianceService,
  ],
})
export class FinanceModule {}
