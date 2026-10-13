import { defineConfig } from 'drizzle-kit';

if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    try {
      process.loadEnvFile('../../.env');
    } catch {
      // ignore
    }
  }
}

export default defineConfig({
  schema: './dist/schema/index.js',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://stokrova:stokrova_dev_password@localhost:5432/stokrova_dev',
  },
  strict: true,
  verbose: true,
});

