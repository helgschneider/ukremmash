import { useMemo, useState } from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  FileSpreadsheet,
  FileText,
  Pencil,
  Trash2,
  Search,
  Inbox,
  Phone,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportToExcel, exportToPdf } from "@/lib/export";
import { STATUSES, formatAddress, formatDateTime, type RepairRequest, type RequestStatus, type Role } from "@/lib/requests";

interface Props {
  requests: RepairRequest[];
  role: Role;
  onEdit: (r: RepairRequest) => void;
  onDelete: (id: string) => void;
}

type SortKey = "createdAt" | "status" | "street" | "applicant";
type StatusFilter = "all" | RequestStatus;

export function StatusBadge({ status }: { status: RequestStatus }) {
  return status === "Выполнено" ? (
    <Badge className="whitespace-nowrap bg-success text-success-foreground hover:bg-success">Выполнено</Badge>
  ) : (
    <Badge className="whitespace-nowrap bg-warning text-warning-foreground hover:bg-warning">В обработке</Badge>
  );
}

export function RequestsTable({ requests, role, onEdit, onDelete }: Props) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [pendingDelete, setPendingDelete] = useState<RepairRequest | null>(null);
  const [exporting, setExporting] = useState<"xlsx" | "pdf" | null>(null);

  const isAdmin = role === "admin";
  const canManage = (r: RepairRequest) => isAdmin || r.createdBy === "user";

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = requests.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.street, r.house, r.apartment, r.applicant, r.phone, r.description, r.result]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return list.sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      return av.localeCompare(bv, "ru") * dir;
    });
  }, [requests, statusFilter, query, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "createdAt" ? "desc" : "asc");
    }
  };

  const runExport = async (kind: "xlsx" | "pdf") => {
    if (visible.length === 0) {
      toast.error("Нет заявок для экспорта");
      return;
    }
    setExporting(kind);
    try {
      if (kind === "xlsx") await exportToExcel(visible);
      else await exportToPdf(visible);
      toast.success(kind === "xlsx" ? "Файл Excel сохранён" : "Файл PDF сохранён");
    } catch (e) {
      console.error(e);
      toast.error("Не удалось сформировать файл");
    } finally {
      setExporting(null);
    }
  };

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? null : sortDir === "desc" ? (
      <ArrowDownWideNarrow className="ml-1 inline h-3.5 w-3.5" />
    ) : (
      <ArrowUpNarrowWide className="ml-1 inline h-3.5 w-3.5" />
    );

  const counts = useMemo(
    () => ({
      total: requests.length,
      open: requests.filter((r) => r.status === "В обработке").length,
      done: requests.filter((r) => r.status === "Выполнено").length,
    }),
    [requests],
  );

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Всего" value={counts.total} />
          <Stat label="В обработке" value={counts.open} tone="warning" />
          <Stat label="Выполнено" value={counts.done} tone="success" />
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по адресу, заявителю, телефону…"
            className="pl-9"
            aria-label="Поиск"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="sm:w-44" aria-label="Фильтр по статусу">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Button variant="outline" onClick={() => runExport("xlsx")} disabled={exporting !== null}>
            <FileSpreadsheet className="h-4 w-4" />
            {exporting === "xlsx" ? "Формируем…" : "Экспорт в Excel"}
          </Button>
          <Button variant="outline" onClick={() => runExport("pdf")} disabled={exporting !== null}>
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Формируем…" : "Экспорт в PDF"}
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Показано {visible.length} из {requests.length}
      </p>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-card py-16 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="font-medium">Заявок нет</p>
          <p className="text-sm text-muted-foreground">Измените фильтры или добавьте новую заявку.</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-lg border bg-card md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="w-10">№</TableHead>
                  <SortableHead onClick={() => toggleSort("createdAt")}>
                    Создана <SortIcon k="createdAt" />
                  </SortableHead>
                  <SortableHead onClick={() => toggleSort("street")}>
                    Адрес <SortIcon k="street" />
                  </SortableHead>
                  <SortableHead onClick={() => toggleSort("applicant")}>
                    Заявитель <SortIcon k="applicant" />
                  </SortableHead>
                  <TableHead>Суть заявки</TableHead>
                  <SortableHead onClick={() => toggleSort("status")}>
                    Статус <SortIcon k="status" />
                  </SortableHead>
                  {isAdmin && <TableHead>Выполнено</TableHead>}
                  <TableHead className="w-24 text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((r, i) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(r.createdAt)}</TableCell>
                    <TableCell className="min-w-40">{formatAddress(r)}</TableCell>
                    <TableCell className="min-w-36">
                      <div className="font-medium">{r.applicant}</div>
                      <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="text-xs text-muted-foreground hover:text-primary">
                        {r.phone}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-3 whitespace-pre-line">{r.description}</p>
                      {isAdmin && r.result && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">Результат: {r.result}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    {isAdmin && <TableCell className="whitespace-nowrap">{formatDateTime(r.completedAt)}</TableCell>}
                    <TableCell className="text-right">
                      {canManage(r) && (
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost" onClick={() => onEdit(r)} aria-label="Редактировать">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(r)}
                            aria-label="Удалить"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {visible.map((r) => (
              <li key={r.id} className="rounded-lg border bg-card p-4 shadow-xs">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</p>
                    <p className="mt-1 flex items-start gap-1.5 font-medium">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{formatAddress(r)}</span>
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-3 whitespace-pre-line text-sm">{r.description}</p>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="font-medium">{r.applicant}</span>
                  <a href={`tel:${r.phone.replace(/[^\d+]/g, "")}`} className="flex items-center gap-1 text-primary">
                    <Phone className="h-3.5 w-3.5" /> {r.phone}
                  </a>
                </div>
                {isAdmin && r.status === "Выполнено" && (
                  <div className="mt-3 rounded-md bg-muted p-2 text-xs">
                    <p className="text-muted-foreground">Выполнено: {formatDateTime(r.completedAt)}</p>
                    {r.result && <p className="mt-1">{r.result}</p>}
                  </div>
                )}
                {canManage(r) && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(r)}>
                      <Pencil className="h-4 w-4" /> Изменить
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setPendingDelete(r)}
                    >
                      <Trash2 className="h-4 w-4" /> Удалить
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить заявку?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `${formatAddress(pendingDelete)} — ${pendingDelete.applicant}. ` : ""}
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete) {
                  onDelete(pendingDelete.id);
                  toast.success("Заявка удалена");
                }
                setPendingDelete(null);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SortableHead({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <TableHead>
      <button type="button" onClick={onClick} className="inline-flex items-center whitespace-nowrap font-medium hover:text-foreground">
        {children}
      </button>
    </TableHead>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "warning" | "success" }) {
  const toneClass =
    tone === "warning" ? "border-l-warning" : tone === "success" ? "border-l-success" : "border-l-primary";
  return (
    <div className={`rounded-lg border border-l-4 bg-card px-3 py-2 sm:px-4 sm:py-3 ${toneClass}`}>
      <p className="text-xs text-muted-foreground sm:text-sm">{label}</p>
      <p className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
    </div>
  );
}
