import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const prismaDir = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(prismaDir, 'schema.prisma');
const migrationsDir = path.join(prismaDir, 'migrations');
const prismaBin = path.join(prismaDir, '..', 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');

function runPrisma(args, databaseUrl) {
  return execFileSync(prismaBin, args, {
    cwd: path.join(prismaDir, '..'),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
}

test('migration lock provider matches the schema datasource', () => {
  const schemaProvider = readFileSync(schemaPath, 'utf8').match(/datasource\s+db\s*\{[^}]*provider\s*=\s*"([^"]+)"/)?.[1];
  const lockProvider = readFileSync(path.join(migrationsDir, 'migration_lock.toml'), 'utf8').match(/provider\s*=\s*"([^"]+)"/)?.[1];
  assert.equal(lockProvider, schemaProvider);
});

test('migrations apply to a fresh database and match the schema', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'qa-migrations-'));
  try {
    const databaseUrl = `file:${path.join(dir, 'fresh.db')}`;
    runPrisma(['migrate', 'deploy', '--schema', schemaPath], databaseUrl);
    // Exit code 0 means applying every migration produces exactly the current schema.
    runPrisma(['migrate', 'diff', '--from-migrations', migrationsDir, '--to-schema-datamodel', schemaPath, '--shadow-database-url', `file:${path.join(dir, 'shadow.db')}`, '--exit-code'], databaseUrl);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
