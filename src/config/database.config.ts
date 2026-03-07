import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const useSsl =
    process.env.DATABASE_SSL === 'true' ||
    process.env.DATABASE_SSL === '1' ||
    process.env.DATABASE_SSL?.toLowerCase() === 'require';
  const rejectUnauthorized =
    process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false';
  const sslConfig = useSsl ? { rejectUnauthorized } : false;

  const baseConfig = {
    ssl: sslConfig,
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
  };

  if (process.env.DATABASE_URL) {
    let url = process.env.DATABASE_URL;
    // sslmode na URL sobrescreve o objeto ssl no pg.Pool - precisamos controlar via URL
    if (useSsl) {
      url = url.replace(/\?sslmode=[^&]+&?/i, '?').replace(/&sslmode=[^&]+/gi, '');
      if (url.endsWith('?')) url = url.slice(0, -1);
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}sslmode=${rejectUnauthorized ? 'require' : 'no-verify'}`;
    }
    return {
      type: 'postgres' as const,
      url,
      ...baseConfig,
    };
  }

  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'odoo_wrapper',
    ...baseConfig,
  };
});
