import { registerAs } from '@nestjs/config';

export default registerAs('database', () => {
  const useSsl = process.env.DATABASE_SSL === 'true';
  const sslConfig = useSsl
    ? {
        rejectUnauthorized:
          process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false',
      }
    : false;

  if (process.env.DATABASE_URL) {
    return {
      type: 'postgres' as const,
      url: process.env.DATABASE_URL,
      ssl: sslConfig,
      autoLoadEntities: true,
      synchronize: process.env.NODE_ENV !== 'production',
    };
  }

  return {
    type: 'postgres' as const,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'odoo_wrapper',
    ssl: sslConfig,
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
  };
});
