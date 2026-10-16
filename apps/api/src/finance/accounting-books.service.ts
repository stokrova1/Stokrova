import { DurableMap } from '../infrastructure/database/durable-map.js';
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AccountingBook,
  CreateAccountingBookRequest,
  UpdateAccountingBookRequest,
  FiscalYear,
  CreateFiscalYearRequest,
  AccountingPeriod,
  CreateAccountingPeriodRequest,
  CloseAccountingPeriodRequest,
  ReopenAccountingPeriodRequest,
} from '@stokrova/contracts';
import {
  CreateAccountingBookSchema,
  UpdateAccountingBookSchema,
  CreateFiscalYearSchema,
  CreateAccountingPeriodSchema,
  CloseAccountingPeriodSchema,
  ReopenAccountingPeriodSchema,
} from '@stokrova/validation';
import {
  assertValidPeriodStatusTransition,
  FinanceDomainError,
} from '@stokrova/domain';

@Injectable()
export class AccountingBooksService {
  private readonly books = new DurableMap<AccountingBook>('accounting_books');
  private readonly fiscalYears = new DurableMap<FiscalYear>('fiscal_years');
  private readonly periods = new DurableMap<AccountingPeriod>('accounting_periods');

  // ==========================================================================
  // Accounting Books
  // ==========================================================================

  async createBook(
    tenantId: string,
    req: CreateAccountingBookRequest,
  ): Promise<AccountingBook> {
    const parsed = CreateAccountingBookSchema.parse(req);
    const code = parsed.code.trim().toUpperCase();

    const existing = Array.from(this.books.values()).find(
      (b) =>
        b.tenant_id === tenantId &&
        b.company_id === parsed.company_id &&
        b.code === code,
    );
    if (existing) {
      throw new ConflictException(
        `Accounting book with code '${code}' already exists for company '${parsed.company_id}'.`,
      );
    }

    const now = new Date().toISOString();
    const book: AccountingBook = {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: parsed.company_id,
      code,
      name: parsed.name.trim(),
      functional_currency: (parsed.functional_currency ?? 'USD').toUpperCase(),
      fiscal_year_start_month: parsed.fiscal_year_start_month ?? 1,
      is_active: true,
      created_at: now,
      updated_at: now,
    };

    this.books.set(book.id, book);
    return book;
  }

  async updateBook(
    tenantId: string,
    bookId: string,
    req: UpdateAccountingBookRequest,
  ): Promise<AccountingBook> {
    const parsed = UpdateAccountingBookSchema.parse(req);
    const book = await this.getBookById(tenantId, bookId);

    if (parsed.name !== undefined) {
      book.name = parsed.name.trim();
    }
    if (parsed.is_active !== undefined) {
      book.is_active = parsed.is_active;
    }

    book.updated_at = new Date().toISOString();
    return book;
  }

  async getBookById(tenantId: string, bookId: string): Promise<AccountingBook> {
    const book = this.books.get(bookId);
    if (!book || book.tenant_id !== tenantId) {
      throw new NotFoundException(`Accounting book '${bookId}' not found.`);
    }
    return book;
  }

  async listBooks(
    tenantId: string,
    filter?: { company_id?: string; is_active?: boolean },
  ): Promise<AccountingBook[]> {
    return Array.from(this.books.values()).filter((b) => {
      if (b.tenant_id !== tenantId) return false;
      if (filter?.company_id && b.company_id !== filter.company_id) return false;
      if (filter?.is_active !== undefined && b.is_active !== filter.is_active) return false;
      return true;
    });
  }

  // ==========================================================================
  // Fiscal Years
  // ==========================================================================

  async createFiscalYear(
    tenantId: string,
    req: CreateFiscalYearRequest,
  ): Promise<FiscalYear> {
    const parsed = CreateFiscalYearSchema.parse(req);
    await this.getBookById(tenantId, parsed.book_id);

    const yearCode = parsed.year_code.trim().toUpperCase();
    const existing = Array.from(this.fiscalYears.values()).find(
      (fy) =>
        fy.tenant_id === tenantId &&
        fy.book_id === parsed.book_id &&
        fy.year_code === yearCode,
    );
    if (existing) {
      throw new ConflictException(
        `Fiscal year '${yearCode}' already exists for book '${parsed.book_id}'.`,
      );
    }

    const now = new Date().toISOString();
    const fy: FiscalYear = {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: parsed.company_id,
      book_id: parsed.book_id,
      year_code: yearCode,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      is_closed: false,
      created_at: now,
      updated_at: now,
    };

    this.fiscalYears.set(fy.id, fy);
    return fy;
  }

  async getFiscalYearById(tenantId: string, fyId: string): Promise<FiscalYear> {
    const fy = this.fiscalYears.get(fyId);
    if (!fy || fy.tenant_id !== tenantId) {
      throw new NotFoundException(`Fiscal year '${fyId}' not found.`);
    }
    return fy;
  }

  // ==========================================================================
  // Accounting Periods
  // ==========================================================================

  async createPeriod(
    tenantId: string,
    req: CreateAccountingPeriodRequest,
  ): Promise<AccountingPeriod> {
    const parsed = CreateAccountingPeriodSchema.parse(req);
    await this.getBookById(tenantId, parsed.book_id);
    await this.getFiscalYearById(tenantId, parsed.fiscal_year_id);

    const existing = Array.from(this.periods.values()).find(
      (p) =>
        p.tenant_id === tenantId &&
        p.book_id === parsed.book_id &&
        p.fiscal_year_id === parsed.fiscal_year_id &&
        p.period_number === parsed.period_number,
    );
    if (existing) {
      throw new ConflictException(
        `Period number ${parsed.period_number} already exists for this fiscal year.`,
      );
    }

    const now = new Date().toISOString();
    const period: AccountingPeriod = {
      id: randomUUID(),
      tenant_id: tenantId,
      company_id: parsed.company_id,
      book_id: parsed.book_id,
      fiscal_year_id: parsed.fiscal_year_id,
      period_number: parsed.period_number,
      name: parsed.name.trim(),
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      status: 'OPEN',
      closed_at: null,
      closed_by: null,
      created_at: now,
      updated_at: now,
    };

    this.periods.set(period.id, period);
    return period;
  }

  async getPeriodById(tenantId: string, periodId: string): Promise<AccountingPeriod> {
    const p = this.periods.get(periodId);
    if (!p || p.tenant_id !== tenantId) {
      throw new NotFoundException(`Accounting period '${periodId}' not found.`);
    }
    return p;
  }

  async getPeriodForDate(
    tenantId: string,
    companyId: string,
    dateIso: string,
  ): Promise<AccountingPeriod | null> {
    const targetTime = new Date(dateIso).getTime();
    const matching = Array.from(this.periods.values()).find((p) => {
      if (p.tenant_id !== tenantId || p.company_id !== companyId) return false;
      const s = new Date(p.start_date).getTime();
      const e = new Date(p.end_date).getTime();
      return targetTime >= s && targetTime <= e;
    });

    return matching ?? null;
  }

  async listPeriods(
    tenantId: string,
    bookId?: string,
    fiscalYearId?: string,
  ): Promise<AccountingPeriod[]> {
    return Array.from(this.periods.values())
      .filter((p) => {
        if (p.tenant_id !== tenantId) return false;
        if (bookId && p.book_id !== bookId) return false;
        if (fiscalYearId && p.fiscal_year_id !== fiscalYearId) return false;
        return true;
      })
      .sort((a, b) => a.period_number - b.period_number);
  }

  async closePeriod(
    tenantId: string,
    periodId: string,
    req: CloseAccountingPeriodRequest,
  ): Promise<AccountingPeriod> {
    const parsed = CloseAccountingPeriodSchema.parse(req);
    const period = await this.getPeriodById(tenantId, periodId);

    try {
      assertValidPeriodStatusTransition(period.status, 'CLOSED');
    } catch (err: unknown) {
      if (err instanceof FinanceDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    period.status = 'CLOSED';
    period.closed_at = now;
    period.closed_by = parsed.closed_by;
    period.updated_at = now;

    return period;
  }

  async reopenPeriod(
    tenantId: string,
    periodId: string,
    req: ReopenAccountingPeriodRequest,
  ): Promise<AccountingPeriod> {
    ReopenAccountingPeriodSchema.parse(req);
    const period = await this.getPeriodById(tenantId, periodId);

    try {
      assertValidPeriodStatusTransition(period.status, 'OPEN');
    } catch (err: unknown) {
      if (err instanceof FinanceDomainError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const now = new Date().toISOString();
    period.status = 'OPEN';
    period.closed_at = null;
    period.closed_by = null;
    period.updated_at = now;

    return period;
  }

  // ==========================================================================
  // Helper: Seed Default Book, Fiscal Year & 12 Periods
  // ==========================================================================

  async seedDefaultBookAndPeriods(
    tenantId: string,
    companyId: string,
    year = 2026,
  ): Promise<{ book: AccountingBook; fiscalYear: FiscalYear; periods: AccountingPeriod[] }> {
    let book = Array.from(this.books.values()).find(
      (b) => b.tenant_id === tenantId && b.company_id === companyId,
    );
    if (!book) {
      book = await this.createBook(tenantId, {
        company_id: companyId,
        code: 'MAIN-BOOK',
        name: 'Primary Operating Ledger Book',
        functional_currency: 'USD',
        fiscal_year_start_month: 1,
      });
    }

    let fy = Array.from(this.fiscalYears.values()).find(
      (f) => f.tenant_id === tenantId && f.book_id === book.id && f.year_code === `FY${year}`,
    );
    if (!fy) {
      fy = await this.createFiscalYear(tenantId, {
        company_id: companyId,
        book_id: book.id,
        year_code: `FY${year}`,
        start_date: `${year}-01-01T00:00:00Z`,
        end_date: `${year}-12-31T23:59:59Z`,
      });
    }

    const seededPeriods: AccountingPeriod[] = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];

    for (let m = 1; m <= 12; m++) {
      const existing = Array.from(this.periods.values()).find(
        (p) => p.tenant_id === tenantId && p.book_id === book.id && p.fiscal_year_id === fy.id && p.period_number === m,
      );
      if (existing) {
        seededPeriods.push(existing);
      } else {
        const monthPad = m.toString().padStart(2, '0');
        const lastDay = new Date(year, m, 0).getDate();
        const p = await this.createPeriod(tenantId, {
          company_id: companyId,
          book_id: book.id,
          fiscal_year_id: fy.id,
          period_number: m,
          name: `Period ${m} - ${monthNames[m - 1]} ${year}`,
          start_date: `${year}-${monthPad}-01T00:00:00Z`,
          end_date: `${year}-${monthPad}-${lastDay}T23:59:59Z`,
        });
        seededPeriods.push(p);
      }
    }

    return { book, fiscalYear: fy, periods: seededPeriods };
  }
}
