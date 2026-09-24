import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { RepairRequest, Role } from "@/lib/requests";
import type { Dictionaries, DictKey } from "@/lib/dictionaries";

const tokenSchema = z.object({ token: z.string().min(1).max(500) });

const fields = z.object({
  street: z.string().max(200),
  house: z.string().max(50),
  entrance: z.string().max(50),
  floor: z.string().max(50),
  apartment: z.string().max(50),
  applicant: z.string().max(200),
  phone: z.string().max(50),
  description: z.string().max(5000),
});

type Row = {
  id: string; street: string; house: string; entrance: string; floor: string; apartment: string;
  applicant: string; phone: string; description: string; created_at: string; created_by: string;
  status: string; completed_at: string | null; result: string;
};

const toRequest = (r: Row): RepairRequest => ({
  id: r.id, street: r.street, house: r.house, entrance: r.entrance, floor: r.floor,
  apartment: r.apartment, applicant: r.applicant, phone: r.phone, description: r.description,
  createdAt: r.created_at, createdBy: r.created_by as Role,
  status: r.status as RepairRequest["status"], completedAt: r.completed_at, result: r.result,
});

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const login = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ password: z.string().max(200) }).parse(d))
  .handler(async ({ data }) => {
    const { resolveRole, issueToken } = await import("@/lib/auth.server");
    const role = resolveRole(data.password.trim());
    if (!role) return { ok: false as const };
    return { ok: true as const, role, token: issueToken(role) };
  });

export const loadAll = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("@/lib/auth.server");
    verifyToken(data.token);
    const sb = await db();
    const [{ data: reqs, error: e1 }, { data: dicts, error: e2 }] = await Promise.all([
      sb.from("repair_requests").select("*").order("created_at", { ascending: false }),
      sb.from("app_dictionaries").select("*"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);
    const d: Dictionaries = {
      street: { values: [], defaultValue: null },
      house: { values: [], defaultValue: null },
      entrance: { values: [], defaultValue: null },
      floor: { values: [], defaultValue: null },
    };
    for (const row of dicts ?? []) {
      if (row.key in d) d[row.key as DictKey] = { values: row.values ?? [], defaultValue: row.default_value };
    }
    return { requests: (reqs as Row[]).map(toRequest), dicts: d };
  });

export const createRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.extend({ fields }).parse(d))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("@/lib/auth.server");
    const role = verifyToken(data.token);
    if (role === "supervisor") throw new Error("Forbidden");
    const sb = await db();
    const { data: row, error } = await sb
      .from("repair_requests")
      .insert({ ...data.fields, created_by: role, status: "В обработке" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return toRequest(row as Row);
  });

export const updateRequest = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    tokenSchema
      .extend({
        id: z.string().uuid(),
        fields,
        status: z.enum(["В обработке", "Выполнено"]),
        completedAt: z.string().nullable(),
        result: z.string().max(5000),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { verifyToken } = await import("@/lib/auth.server");
    const role = verifyToken(data.token);
    if (role === "supervisor") throw new Error("Forbidden");
    const sb = await db();
    const { data: existing } = await sb.from("repair_requests").select("created_by").eq("id", data.id).single();
    if (!existing) throw new Error("Not found");
    if (role !== "admin" && existing.created_by !== role) throw new Error("Forbidden");
    const patch =
      role === "admin"
        ? { ...data.fields, status: data.status, completed_at: data.completedAt, result: data.result }
        : { ...data.fields };
    const { data: row, error } = await sb.from("repair_requests").update(patch).eq("id", data.id).select("*").single();
    if (error) throw new Error(error.message);
    return toRequest(row as Row);
  });

export const deleteRequest = createServerFn({ method: "POST" })
  .inputValidator((d) => tokenSchema.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { verifyToken } = await import("@/lib/auth.server");
    const role = verifyToken(data.token);
    if (role === "supervisor") throw new Error("Forbidden");
    const sb = await db();
    let q = sb.from("repair_requests").delete().eq("id", data.id);
    if (role !== "admin") q = q.eq("created_by", role);
    const { error } = await q;
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const dictSchema = z.object({ values: z.array(z.string().max(200)).max(500), defaultValue: z.string().max(200).nullable() });

export const saveDicts = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    tokenSchema
      .extend({ dicts: z.object({ street: dictSchema, house: dictSchema, entrance: dictSchema, floor: dictSchema }) })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { verifyToken } = await import("@/lib/auth.server");
    if (verifyToken(data.token) !== "admin") throw new Error("Forbidden");
    const sb = await db();
    const rows = (Object.keys(data.dicts) as DictKey[]).map((k) => ({
      key: k,
      values: data.dicts[k].values,
      default_value: data.dicts[k].defaultValue,
    }));
    const { error } = await sb.from("app_dictionaries").upsert(rows);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
