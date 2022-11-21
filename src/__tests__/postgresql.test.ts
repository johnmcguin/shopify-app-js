import * as child_process from 'child_process';
import {promisify} from 'util';

import pg from 'pg';
import {
  batteryOfTests,
  poll,
} from '@shopify/shopify-app-session-storage-test-utils';

import {PostgreSQLSessionStorage} from '../postgresql';

const exec = promisify(child_process.exec);

const dbURL = new URL('postgres://shopify:passify@localhost/shopitest');

describe('PostgreSQLSessionStorage', () => {
  let storage: PostgreSQLSessionStorage;
  let containerId: string;
  beforeAll(async () => {
    const runCommand = await exec(
      'podman run -d -e POSTGRES_DB=shopitest -e POSTGRES_USER=shopify -e POSTGRES_PASSWORD=passify -p 5432:5432 postgres:14',
      {encoding: 'utf8'},
    );
    containerId = runCommand.stdout.trim();

    await poll(
      async () => {
        try {
          const client = new pg.Client({connectionString: dbURL.toString()});
          await new Promise<void>((resolve, reject) => {
            client.connect((err) => {
              if (err) reject(err);
              resolve();
            });
          });
          await client.end();
        } catch {
          return false;
        }
        return true;
      },
      {interval: 500, timeout: 20000},
    );
    storage = new PostgreSQLSessionStorage(dbURL);
    await storage.ready;
  });

  afterAll(async () => {
    await storage.disconnect();
    await exec(`podman rm -f ${containerId}`);
  });

  batteryOfTests(async () => storage);
});
