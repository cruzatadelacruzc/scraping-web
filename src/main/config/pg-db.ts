import { Pool, PoolClient, QueryConfig, QueryResult, QueryResultRow } from 'pg';
import { injectable, inject } from 'inversify';
import { ILogger } from '@shared/logger.interfaces';
import { TYPES } from '@shared/types.container';

export interface IDbQuery {
  text: string;
  values?: any[];
}

export interface IDbClient {
  query<T extends QueryResultRow = any>(query: IDbQuery | string, values?: any[]): Promise<QueryResult<T>>;
  release(): void;
}

export interface IDbPool {
  query<T extends QueryResultRow = any>(query: IDbQuery | string, values?: any[]): Promise<QueryResult<T>>;
  connect(): Promise<IDbClient>;
  end(): Promise<void>;
}

interface ITrackedPoolClient extends Omit<PoolClient, 'query'> {
  lastQuery?: { text: string; values?: any[] };
  _decorated?: boolean;
  query: <T extends QueryResultRow = any>(queryTextOrConfig: string | QueryConfig, values?: any[]) => Promise<QueryResult<T>>;
}

@injectable()
export class PgDBContext implements IDbPool {
  private _pool: Pool | null = null;

  public constructor(@inject(TYPES.Logger) private readonly _logger: ILogger) {}

  /**
   * Create connection with PostgreSQL database.
   */
  public async dbConnect(): Promise<void> {
    const DB_URI = process.env.TENANT_DB_URL!;
    try {
      this._pool = new Pool({
        connectionString: DB_URI,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        application_name: 'scraping-web',
      });

      this._pool.on('error', err => this._logger.error('Unexpected PG pool error', { error: err }));

      // verify a connection
      const client = await this._pool.connect();
      await client.query('SELECT current_database()');
      client.release();
      this._logger.info('Tenant Database connection established.');
    } catch (error) {
      this._logger.error('Database connection failed', { error });
      throw error;
    }
  }

  /**
   * Simple query via pool (non-transactional).
   */
  public async query<T extends QueryResultRow>(queryTextOrConfig: string | IDbQuery, values?: any[]): Promise<QueryResult<T>> {
    if (!this._pool) throw new Error('Database connection not initialized');

    const start = Date.now();
    try {
      if (typeof queryTextOrConfig === 'string') {
        return await this._pool.query<T>(queryTextOrConfig, values);
      }
      return await this._pool.query<T>(queryTextOrConfig);
    } catch (error) {
      this._logger.error('Query failed', {
        query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
        error,
      });
      throw error;
    } finally {
      const duration = Date.now() - start;
      this._logger.debug('Query executed', {
        duration,
        query: typeof queryTextOrConfig === 'string' ? queryTextOrConfig : queryTextOrConfig.text,
      });
    }
  }

  /**
   * Return the raw Pool instance (for advanced usages).
   */
  public getPool(): Pool {
    if (!this._pool) {
      throw new Error('Database connection not initialized');
    }
    return this._pool;
  }

  /**
   * Get a client connection with diagnostics
   */
  public async connect(): Promise<IDbClient> {
    if (!this._pool) throw new Error('Database connection not initialized');

    const baseClient = await this._pool.connect();
    const client = baseClient as ITrackedPoolClient;
    const acquisitionStack = new Error('Client acquisition stack').stack;

    // Monkey-patch query to track last query
    const origQuery = client.query.bind(client);
    const enhancedQuery = async <T extends QueryResultRow>(textOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult<T>> => {
      const queryInfo = {
        text: typeof textOrConfig === 'string' ? textOrConfig : textOrConfig.text,
        values: typeof textOrConfig === 'string' ? values : textOrConfig.values,
      };
      client.lastQuery = queryInfo;
      try {
        return (await (typeof textOrConfig === 'string' ? origQuery(textOrConfig, values) : origQuery(textOrConfig))) as QueryResult<T>;
      } catch (error) {
        this._logger.error('Query failed in client', {
          error,
          query: queryInfo.text,
          values: queryInfo.values,
        });
        throw error;
      }
    };
    client.query = enhancedQuery;

    // Setup leak detection
    const timeout = setTimeout(() => {
      this._logger.warn('Potential client leak detected', {
        acquisitionStack,
        lastQuery: client.lastQuery,
        timeout: '5000ms',
      });
    }, 5000);

    // Monkey-patch release for cleanup
    const origRelease = client.release.bind(client);
    const wrappedRelease = (): void => {
      clearTimeout(timeout);
      client.query = origQuery;
      client.release = origRelease;
      origRelease();
    };
    client.release = wrappedRelease;

    return client;
  }

  /**
   * End pool and all connections
   */
  public async end(): Promise<void> {
    if (this._pool) {
      await this._pool.end();
      this._pool = null;
    }
  }
}
