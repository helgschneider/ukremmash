import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { LogOut, Zap, ClipboardList, FilePlus2, LayoutDashboard, ShieldCheck, User, Eye, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/LoginForm";
import { NewRequestForm } from "@/components/NewRequestForm";
import { RequestsTable } from "@/components/RequestsTable";
import { EditRequestDialog } from "@/components/EditRequestDialog";
import { DictionariesManager } from "@/components/DictionariesManager";
import type { RequestFieldValues } from "@/components/RequestFields";
import { defaultDictionaries, type Dictionaries } from "@/lib/dictionaries";
import { loadSession, saveSession, sortNewestFirst, type RepairRequest, type Session } from "@/lib/requests";
import { createRequest, deleteRequest as deleteRequestFn, loadAll, saveDicts, updateRequest as updateRequestFn } from "@/lib/api.functions";

const TITLE = "Заявки на ремонт электрики";
const DESCRIPTION =
  "Учёт заявок жителей посёлка на ремонт электрики: подача заявки, список с сортировкой и фильтрами, экспорт в Excel и PDF.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const POLL_MS = 15000;

function Index() {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const role = session?.role ?? null;
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [dicts, setDicts] = useState<Dictionaries>(defaultDictionaries);
  const [tab, setTab] = useState<string>("new");
  const [editing, setEditing] = useState<RepairRequest | null>(null);
  const knownIds = useRef<Set<string> | null>(null);

  const loadFn = useServerFn(loadAll);
  const createFn = useServerFn(createRequest);
  const updateFn = useServerFn(updateRequestFn);
  const deleteFn = useServerFn(deleteRequestFn);
  const saveDictsFn = useServerFn(saveDicts);

  const logout = useCallback(() => {
    setSession(null);
    saveSession(null);
    setRequests([]);
    knownIds.current = null;
  }, []);

  useEffect(() => {
    const s = loadSession();
    setSession(s);
    setTab(s?.role === "user" ? "new" : "list");
    setHydrated(true);
  }, []);

  const refresh = useCallback(async () => {
    if (!session) return;
    try {
      const res = await loadFn({ data: { token: session.token } });
      const list = sortNewestFirst(res.requests);
      const prev = knownIds.current;
      if (prev && session.role === "admin" && "Notification" in window && Notification.permission === "granted") {
        for (const req of list) {
          if (prev.has(req.id) || req.createdBy === "admin") continue;
          const addr = [req.street, `д. ${req.house}`, req.apartment ? `кв. ${req.apartment}` : ""].filter(Boolean).join(", ");
          const n = new Notification("Новая заявка!", { body: `Новая заявка! Адрес: ${addr}`, tag: req.id });
          n.onclick = () => {
            window.focus();
            setTab("list");
            n.close();
          };
        }
      }
      knownIds.current = new Set(list.map((x) => x.id));
      setRequests(list);
      setDicts(res.dicts);
    } catch (e) {
      if (e instanceof Error && e.message.includes("Unauthorized")) logout();
    }
  }, [session, loadFn, logout]);

  useEffect(() => {
    if (!session) return;
    refresh();
    const t = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(t);
  }, [session, refresh]);

  useEffect(() => {
    if (role !== "admin" || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission().catch(() => undefined);
  }, [role]);

  const fail = () => toast.error("Не удалось сохранить. Проверьте соединение.");

  const updateDicts = async (next: Dictionaries) => {
    if (!session) return;
    setDicts(next);
    try {
      await saveDictsFn({ data: { token: session.token, dicts: next } });
    } catch {
      fail();
      refresh();
    }
  };

  const login = (s: Session) => {
    setSession(s);
    saveSession(s);
    setTab(s.role === "user" ? "new" : "list");
  };

  const addRequest = async (data: RequestFieldValues) => {
    if (!session || role === "supervisor") return;
    try {
      const req = await createFn({ data: { token: session.token, fields: data } });
      knownIds.current?.add(req.id);
      setRequests((l) => sortNewestFirst([req, ...l]));
      setTab("list");
    } catch {
      fail();
    }
  };

  const updateRequest = async (u: RepairRequest) => {
    if (!session || role === "supervisor") return;
    try {
      const saved = await updateFn({
        data: {
          token: session.token,
          id: u.id,
          fields: {
            street: u.street, house: u.house, entrance: u.entrance, floor: u.floor,
            apartment: u.apartment, applicant: u.applicant, phone: u.phone, description: u.description,
          },
          status: u.status,
          completedAt: u.completedAt,
          result: u.result,
        },
      });
      setRequests((l) => l.map((r) => (r.id === saved.id ? saved : r)));
    } catch {
      fail();
    }
  };

  const deleteRequest = async (id: string) => {
    if (!session || role === "supervisor") return;
    try {
      await deleteFn({ data: { token: session.token, id } });
      setRequests((l) => l.filter((r) => r.id !== id));
    } catch {
      fail();
    }
  };

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!role) return <LoginForm onLogin={login} />;

  const isAdmin = role === "admin";
  const isSupervisor = role === "supervisor";
  const roleLabel = isAdmin ? "Администратор" : isSupervisor ? "Супервизор" : "Пользователь";
  const RoleIcon = isAdmin ? ShieldCheck : isSupervisor ? Eye : User;
  const formKey = [dicts.street, dicts.house, dicts.entrance, dicts.floor].map((d) => d.defaultValue).join("|");

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Zap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight sm:text-lg">Ремонт электрики</h1>
              <p className="hidden text-xs text-muted-foreground sm:block">Учёт заявок жителей посёлка</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
              <RoleIcon className="h-3.5 w-3.5" />
              {roleLabel}
            </Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {isSupervisor ? (
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClipboardList className="h-4 w-4" />
              <span className="font-medium text-foreground">Список заявок</span>
              <span>· режим просмотра</span>
            </div>
            <RequestsTable requests={requests} role={role} onEdit={() => undefined} onDelete={() => undefined} />
          </div>
        ) : (
          <Tabs value={tab} onValueChange={setTab} className="space-y-6">
            <TabsList className={`grid w-full sm:inline-grid sm:w-auto ${isAdmin ? "grid-cols-3" : "grid-cols-2"}`}>
              {isAdmin ? (
                <>
                  <TabsTrigger value="list" className="gap-1.5">
                    <LayoutDashboard className="h-4 w-4" />
                    <span className="truncate">Панель управления</span>
                  </TabsTrigger>
                  <TabsTrigger value="new" className="gap-1.5">
                    <FilePlus2 className="h-4 w-4" />
                    <span className="truncate">Новая заявка</span>
                  </TabsTrigger>
                  <TabsTrigger value="dicts" className="gap-1.5">
                    <BookOpen className="h-4 w-4" />
                    <span className="truncate">Справочники</span>
                  </TabsTrigger>
                </>
              ) : (
                <>
                  <TabsTrigger value="new" className="gap-1.5">
                    <FilePlus2 className="h-4 w-4" />
                    Новая заявка
                  </TabsTrigger>
                  <TabsTrigger value="list" className="gap-1.5">
                    <ClipboardList className="h-4 w-4" />
                    Список заявок
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="new">
              <NewRequestForm key={formKey} onSubmit={addRequest} dicts={dicts} />
            </TabsContent>
            <TabsContent value="list">
              <RequestsTable requests={requests} role={role} onEdit={setEditing} onDelete={deleteRequest} />
            </TabsContent>
            {isAdmin && (
              <TabsContent value="dicts">
                <DictionariesManager dicts={dicts} onChange={updateDicts} />
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>

      {!isSupervisor && (
        <EditRequestDialog
          request={editing}
          role={role}
          dicts={dicts}
          onClose={() => setEditing(null)}
          onSave={updateRequest}
        />
      )}
    </div>
  );
}
