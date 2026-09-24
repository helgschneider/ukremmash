import { createHmac, timingSafeEqual } from "crypto";

export type ServerRole = "user" | "admin" | "supervisor";

const USER_PASSWORD = "user123";
const SUPERVISOR_PASSWORD = "superduper123";
const ADMIN_PASSWORDS = ["adоmin$123", "adomin$123", "admin$123"];
const TTL_MS = 30 * 24 * 3600_000;

export function resolveRole(password: string): ServerRole | null {
  if (password === USER_PASSWORD) return "user";
  if (password === SUPERVISOR_PASSWORD) return "supervisor";
  if (ADMIN_PASSWORDS.includes(password)) return "admin";
  return null;
}

function key() {
  return process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "fallback-dev-key";
}

function sign(payload: string) {
  return createHmac("sha256", key()).update(payload).digest("hex");
}

export function issueToken(role: ServerRole) {
  const payload = `${role}.${Date.now() + TTL_MS}`;
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token: string): ServerRole {
  const parts = (token ?? "").split(".");
  if (parts.length !== 3) throw new Error("Unauthorized");
  const [role, exp, sig] = parts;
  const expected = sign(`${role}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new Error("Unauthorized");
  if (Number(exp) < Date.now()) throw new Error("Unauthorized");
  if (role !== "user" && role !== "admin" && role !== "supervisor") throw new Error("Unauthorized");
  return role;
}
