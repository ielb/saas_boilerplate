import { DataSource } from 'typeorm';
import { env } from '@app/config';
import { join } from 'path';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: env.DATABASE_URL,
  host: env.POSTGRES_HOST,
  port: env.POSTGRES_PORT,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, 'migrations/*{.ts,.js}')],
  synchronize: false, // Disable synchronize for migrations
  logging: env.ENABLE_SQL_LOGGING,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  extra: {
    connectionLimit: env.DB_POOL_MAX,
    acquireTimeout: env.DB_POOL_ACQUIRE_TIMEOUT,
    timeout: env.DB_POOL_IDLE_TIMEOUT,
  },
});
