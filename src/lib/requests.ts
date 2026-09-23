export type Role = "user" | "admin";

export type RequestStatus = "В обработке" | "Выполнено";

export const STATUSES: RequestStatus[] = ["В обработке", "Выполнено"];

export const STREETS = [
  "Институтская",
  "Юбилейная",
  "Школьная",
  "Мира",
  "Спортивная",
];

export interface RepairRequest {
  id: string;
  street: string;
  house: string;
  entrance: string;
  floor: string;
  apartment: string;
  applicant: string;
  phone: string;
  description: string;
  createdAt: string; // ISO
  createdBy: Role;
  status: RequestStatus;
  completedAt: string | null; // ISO
  result: string;
}

const STORAGE_KEY = "electro-requests:v1";
const ROLE_KEY = "electro-requests:role";

// Пароли из технического задания. Административный пароль в ТЗ содержит
// кириллическую «о» — принимаем обе версии написания.
const USER_PASSWORD = "user123";
const ADMIN_PASSWORDS = ["adоmin$123", "adomin$123", "admin$123"];

export function resolveRole(password: string): Role | null {
  if (password === USER_PASSWORD) return "user";
  if (ADMIN_PASSWORDS.includes(password)) return "admin";
  return null;
}

export function loadRole(): Role | null {
  if (typeof window === "undefined") return null;
  const r = window.localStorage.getItem(ROLE_KEY);
  return r === "user" || r === "admin" ? r : null;
}

export function saveRole(role: Role | null) {
  if (role) window.localStorage.setItem(ROLE_KEY, role);
  else window.localStorage.removeItem(ROLE_KEY);
}

export function loadRequests(): RepairRequest[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seed();
    const parsed = JSON.parse(raw) as RepairRequest[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveRequests(list: RepairRequest[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function sortNewestFirst(list: RepairRequest[]) {
  return [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatAddress(r: RepairRequest) {
  const parts = [`ул. ${r.street}, д. ${r.house}`];
  if (r.entrance) parts.push(`под. ${r.entrance}`);
  if (r.floor) parts.push(`эт. ${r.floor}`);
  if (r.apartment) parts.push(`кв. ${r.apartment}`);
  return parts.join(", ");
}

/** Приводит ISO-строку к значению для input[type=datetime-local]. */
export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function seed(): RepairRequest[] {
  const now = Date.now();
  const h = 3600_000;
  const list: RepairRequest[] = [
    {
      id: newId(),
      street: "Центральная",
      house: "12",
      entrance: "2",
      floor: "3",
      apartment: "27",
      applicant: "Иванова Мария",
      phone: "+7 (912) 345-67-89",
      description: "Не работает свет в коридоре, при включении выбивает автомат.",
      createdAt: new Date(now - 26 * h).toISOString(),
      createdBy: "user",
      status: "Выполнено",
      completedAt: new Date(now - 20 * h).toISOString(),
      result: "Заменён автомат 16А в щитке, устранено короткое замыкание в распаечной коробке.",
    },
    {
      id: newId(),
      street: "Садовая",
      house: "4",
      entrance: "1",
      floor: "1",
      apartment: "3",
      applicant: "Петров Сергей",
      phone: "+7 (923) 111-22-33",
      description: "Искрит розетка на кухне, чувствуется запах гари.",
      createdAt: new Date(now - 5 * h).toISOString(),
      createdBy: "user",
      status: "В обработке",
      completedAt: null,
      result: "",
    },
  ];
  saveRequests(list);
  return list;
}
