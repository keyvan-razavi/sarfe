import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, chmodSync } from "node:fs";
import { userInfo } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pgRoot = path.join(root, ".local/postgresql");
const bin = path.join(pgRoot, "root/usr/lib/postgresql/17/bin");
const envPath = path.join(root, ".env");
const databasePassword = randomBytes(36).toString("base64url");
const env = {
  ...process.env,
  LD_LIBRARY_PATH: `${path.join(pgRoot, "root/usr/lib/x86_64-linux-gnu")}${process.env.LD_LIBRARY_PATH ? `:${process.env.LD_LIBRARY_PATH}` : ""}`,
};
const sql = `CREATE ROLE sarfe LOGIN PASSWORD '${databasePassword}';\nCREATE DATABASE sarfe_store OWNER sarfe;\nCREATE DATABASE sarfe_store_test OWNER sarfe;\n`;
const result = spawnSync(path.join(bin, "psql"), ["--no-psqlrc", "--set", "ON_ERROR_STOP=1", "--host", path.join(pgRoot, "socket"), `--username=${userInfo().username}`, "--dbname=postgres"], { env, input: sql, encoding: "utf8" });
if (result.status !== 0) throw new Error(`Could not create local database role/database: ${result.stderr || result.error?.message || "psql failed"}`);

const current = readFileSync(envPath, "utf8");
const localUrl = `postgresql://sarfe:${databasePassword}@127.0.0.1:5432/sarfe_store`;
const testUrl = `postgresql://sarfe:${databasePassword}@127.0.0.1:5432/sarfe_store_test`;
let next = current.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${localUrl}`);
if (next === current) throw new Error("DATABASE_URL setting was not found in .env");
if (/^TEST_DATABASE_URL=/m.test(next)) next = next.replace(/^TEST_DATABASE_URL=.*$/m, `TEST_DATABASE_URL=${testUrl}`);
else next += `${next.endsWith("\n") ? "" : "\n"}TEST_DATABASE_URL=${testUrl}\n`;
writeFileSync(envPath, next, { mode: 0o600 });
chmodSync(envPath, 0o600);
console.log("Created local app and test databases and configured their URLs in .env.");
