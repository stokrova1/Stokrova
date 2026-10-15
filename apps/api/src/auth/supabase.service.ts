import { Injectable, Logger } from '@nestjs/common';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient | null = null;

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const url =
      process.env['SUPABASE_URL'] ||
      process.env['NEXT_PUBLIC_SUPABASE_URL'] ||
      'https://vbtuccvxtgjhaywijmwa.supabase.co';

    const anonKey =
      process.env['SUPABASE_PUBLISHABLE_KEY'] ||
      process.env['SUPABASE_ANON_KEY'] ||
      process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'];

    if (!anonKey) {
      this.logger.warn('Supabase publishable/anon key not provided. Client initialization deferred.');
      return;
    }

    try {
      this.client = createClient(url, anonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });
      this.logger.log(`Supabase client initialized for project: ${url}`);
    } catch (err: any) {
      this.logger.error(`Failed to initialize Supabase client: ${err?.message}`);
    }
  }

  public getClient(): SupabaseClient | null {
    return this.client;
  }

  /**
   * Verifies an access token directly against Supabase Auth API
   */
  public async getUserFromToken(token: string) {
    if (!this.client) {
      return null;
    }
    const { data, error } = await this.client.auth.getUser(token);
    if (error || !data.user) {
      return null;
    }
    return data.user;
  }
}
