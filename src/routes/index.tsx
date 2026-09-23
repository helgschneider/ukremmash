import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LogOut, Zap, ClipboardList, FilePlus2, LayoutDashboard, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/LoginForm";
import { NewRequestForm } from "@/components/NewRequestForm";
import { RequestsTable } from "@/components/RequestsTable";
import { EditRequestDialog } from "@/components/EditRequestDialog";
import type { RequestFieldValues } from "@/components/RequestFields";
import {
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
  const [tab, setTab] = useState<string>("new");
  const [editing, setEditing] = useState<RepairRequest | null>(null);

  useEffect(() => {
    const r = loadRole();
    setRole(r);
    setRequests(sortNewestFirst(loadRequests()));
    setTab(r === "admin" ? "list" : "new");
    setHydrated(true);
  }, []);

  const persist = useCallback((next: RepairRequest[]) => {
    const sorted = sortNewestFirst(next);
    setRequests(sorted);
    saveRequests(sorted);
  }, []);

  const login = (r: Role) => {
    setRole(r);
    saveRole(r);
    setTab(r === "admin" ? "list" : "new");
  };

  const logout = () => {
    setRole(null);
    saveRole(null);
  };

  const addRequest = (data: RequestFieldValues) => {
    if (!role) return;
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

  const updateRequest = (updated: RepairRequest) =>
    persist(requests.map((r) => (r.id === updated.id ? updated : r)));

  const deleteRequest = (id: string) => persist(requests.filter((r) => r.id !== id));

  if (!hydrated) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!role) return <LoginForm onLogin={login} />;

  const isAdmin = role === "admin";

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
              {isAdmin ? <ShieldCheck className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
              {isAdmin ? "Администратор" : "Пользователь"}
            </Badge>
            <Button variant="outline" size="sm" onClick={logout}>
              <LogOut className="h-4 w-4" />
              Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Tabs value={tab} onValueChange={setTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:inline-grid sm:w-auto">
            {isAdmin ? (
              <>
                <TabsTrigger value="list" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  Панель управления
                </TabsTrigger>
                <TabsTrigger value="new" className="gap-1.5">
                  <FilePlus2 className="h-4 w-4" />
                  Новая заявка
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
            <NewRequestForm onSubmit={addRequest} />
          </TabsContent>
          <TabsContent value="list">
            <RequestsTable requests={requests} role={role} onEdit={setEditing} onDelete={deleteRequest} />
          </TabsContent>
        </Tabs>
      </main>

      <EditRequestDialog request={editing} role={role} onClose={() => setEditing(null)} onSave={updateRequest} />
    </div>
  );
}
