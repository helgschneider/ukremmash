import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  DICTS_KEY,
  defaultDictionaries,
  loadDictionaries,
  saveDictionaries,
  type Dictionaries,
} from "@/lib/dictionaries";
import {
  STORAGE_KEY_REQUESTS,
  loadRequests,
  loadRole,
  newId,
  saveRequests,
  saveRole,
  sortNewestFirst,
  type RepairRequest,
  type Role,
} from "@/lib/requests";

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
    ],
  }),
  component: Index,
});

function Index() {
  const [hydrated, setHydrated] = useState(false);
  const [role, setRole] = useState<Role | null>(null);
  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [dicts, setDicts] = useState<Dictionaries>(defaultDictionaries);
  const [tab, setTab] = useState<string>("new");
  const [editing, setEditing] = useState<RepairRequest | null>(null);
  const knownIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const r = loadRole();
    const list = sortNewestFirst(loadRequests());
    knownIds.current = new Set(list.map((x) => x.id));
    setRole(r);
    setRequests(list);
    setDicts(loadDictionaries());
    setTab(r === "user" ? "new" : "list");
    setHydrated(true);
  }, []);

  // Запрос разрешения на уведомления — только для администратора
  useEffect(() => {
    if (role !== "admin" || typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => undefined);
    }
  }, [role]);

  // Синхронизация между вкладками + уведомления о новых заявках (только Admin)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === DICTS_KEY) setDicts(loadDictionaries());
      if (e.key !== STORAGE_KEY_REQUESTS) return;
      const list = sortNewestFirst(loadRequests());
      const fresh = list.filter((x) => !knownIds.current.has(x.id));
      knownIds.current = new Set(list.map((x) => x.id));
      setRequests(list);
      if (role !== "admin" || !("Notification" in window) || Notification.permission !== "granted") return;
      for (const req of fresh) {
        if (req.createdBy === "admin") continue;
        const addr = [req.street, `д. ${req.house}`, req.apartment ? `кв. ${req.apartment}` : ""]
          .filter(Boolean)
          .join(", ");
        const n = new Notification("Новая заявка!", { body: `Новая заявка! Адрес: ${addr}`, tag: req.id });
        n.onclick = () => {
          window.focus();
          setTab("list");
          n.close();
        };
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [role]);

  const persist = useCallback((next: RepairRequest[]) => {
    const sorted = sortNewestFirst(next);
    knownIds.current = new Set(sorted.map((x) => x.id));
    setRequests(sorted);
    saveRequests(sorted);
  }, []);

  const updateDicts = (next: Dictionaries) => {
    setDicts(next);
    saveDictionaries(next);
  };

  const login = (r: Role) => {
    setRole(r);
    saveRole(r);
    setTab(r === "user" ? "new" : "list");
  };

  const logout = () => {
    setRole(null);
    saveRole(null);
  };

  const addRequest = (data: RequestFieldValues) => {
    if (!role || role === "supervisor") return;
    const req: RepairRequest = {
      id: newId(),
      ...data,
      createdAt: new Date().toISOString(),
      createdBy: role,
      status: "В обработке",
      completedAt: null,
      result: "",
    };
    persist([req, ...requests]);
    setTab("list");
  };

  const updateRequest = (updated: RepairRequest) => {
    if (role === "supervisor") return;
    persist(requests.map((r) => (r.id === updated.id ? updated : r)));
  };

  const deleteRequest = (id: string) => {
    if (role === "supervisor") return;
    persist(requests.filter((r) => r.id !== id));
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
