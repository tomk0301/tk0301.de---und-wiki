import { createHash, pbkdf2Sync, randomBytes } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const rl = createInterface({ input, output });
const password = await rl.question("Neues Administrator-Passwort: ");
rl.close();
if (password.length < 14) {
  console.error("Das Passwort muss mindestens 14 Zeichen lang sein.");
  process.exit(1);
}
const salt = randomBytes(16);
const iterations = 310000;
const hash = pbkdf2Sync(password, salt, iterations, 32, "sha256");
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const totpBytes = randomBytes(20);
let bits = [...totpBytes].map((byte) => byte.toString(2).padStart(8, "0")).join("");
let totpSecret = "";
for (let i = 0; i < bits.length; i += 5) totpSecret += alphabet[parseInt(bits.slice(i, i + 5).padEnd(5, "0"), 2)];
const sessionSecret = randomBytes(48).toString("base64url");
const fingerprint = createHash("sha256").update(totpSecret).digest("hex").slice(0, 12);

console.log("\nDiese Werte in die geschützte .env-Datei eintragen:\n");
console.log(`ADMIN_PASSWORD_HASH=${iterations}:${salt.toString("base64url")}:${hash.toString("base64url")}`);
console.log(`ADMIN_TOTP_SECRET=${totpSecret}`);
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log(`\nAuthenticator-Eintrag: TK0301 Admin`);
console.log(`Geheimer Schlüssel: ${totpSecret}`);
console.log(`Prüfsumme zur Dokumentation: ${fingerprint}`);
