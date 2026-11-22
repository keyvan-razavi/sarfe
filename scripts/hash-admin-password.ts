import { randomBytes, scrypt as scryptCallback } from "node:crypto";

const derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scryptCallback(
      password,
      salt,
      64,
      { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
      (error, result) => (error ? reject(error) : resolve(result)),
    ),
  );
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error(
    'Usage: npx tsx scripts/hash-admin-password.ts "a-password-of-at-least-12-characters"',
  );
  process.exit(1);
}

async function main() {
  const salt = randomBytes(16);
  const derived = await derive(password, salt);
  console.log(
    `scrypt$32768$8$1$${salt.toString("hex")}$${derived.toString("hex")}`,
  );
}

main().catch((error: unknown) => {
  console.error("Could not generate the admin password hash.", error);
  process.exitCode = 1;
});
