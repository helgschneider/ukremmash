import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestFields, validateFields, type RequestFieldValues } from "@/components/RequestFields";
import {
  STATUSES,
  formatDateTime,
  fromLocalInput,
  toLocalInput,
  type RepairRequest,
  type RequestStatus,
  type Role,
} from "@/lib/requests";

interface Props {
  request: RepairRequest | null;
  role: Role;
  onClose: () => void;
  onSave: (updated: RepairRequest) => void;
}

export function EditRequestDialog({ request, role, onClose, onSave }: Props) {
  const [values, setValues] = useState<RequestFieldValues | null>(null);
  const [errors, setErrors] = useState<Partial<Record<keyof RequestFieldValues, string>>>({});
  const [status, setStatus] = useState<RequestStatus>("В обработке");
  const [completedAt, setCompletedAt] = useState("");
  const [result, setResult] = useState("");

  useEffect(() => {
    if (!request) return;
    setValues({
      street: request.street,
      house: request.house,
      entrance: request.entrance,
      floor: request.floor,
      apartment: request.apartment,
      applicant: request.applicant,
      phone: request.phone,
      description: request.description,
    });
    setErrors({});
    setStatus(request.status);
    setCompletedAt(toLocalInput(request.completedAt));
    setResult(request.result);
  }, [request]);

  const handleStatus = (s: RequestStatus) => {
    setStatus(s);
    if (s === "Выполнено" && !completedAt) setCompletedAt(toLocalInput(new Date().toISOString()));
  };

  const save = () => {
    if (!request || !values) return;
    const res = validateFields(values);
    if (!res.ok) {
      setErrors(res.errors);
      toast.error("Проверьте заполнение формы");
      return;
    }
    const updated: RepairRequest = { ...request, ...res.data };
    if (role === "admin") {
      updated.status = status;
      updated.completedAt = status === "Выполнено" ? fromLocalInput(completedAt) : null;
      updated.result = result.trim().slice(0, 2000);
    }
    onSave(updated);
    toast.success("Изменения сохранены");
    onClose();
  };

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] w-[calc(100vw-1.5rem)] max-w-2xl overflow-y-auto sm:w-full">
        <DialogHeader>
          <DialogTitle>Редактирование заявки</DialogTitle>
          <DialogDescription>
            Создана {request ? formatDateTime(request.createdAt) : ""}
          </DialogDescription>
        </DialogHeader>

        {values && (
          <div className="space-y-6">
            <RequestFields
              values={values}
              errors={errors}
              onChange={(patch) => {
                setValues((v) => (v ? { ...v, ...patch } : v));
                setErrors((er) => {
                  const next = { ...er };
                  for (const k of Object.keys(patch) as (keyof RequestFieldValues)[]) delete next[k];
                  return next;
                });
              }}
              idPrefix="edit"
            />

            {role === "admin" && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">Обработка заявки</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="edit-status">Статус</Label>
                      <Select value={status} onValueChange={(v) => handleStatus(v as RequestStatus)}>
                        <SelectTrigger id="edit-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-completed">Дата и время выполнения</Label>
                      <Input
                        id="edit-completed"
                        type="datetime-local"
                        value={completedAt}
                        onChange={(e) => setCompletedAt(e.target.value)}
                        disabled={status !== "Выполнено"}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-result">Результат выполнения</Label>
                    <Textarea
                      id="edit-result"
                      rows={4}
                      value={result}
                      onChange={(e) => setResult(e.target.value)}
                      placeholder="Что сделано, какие материалы использованы, рекомендации"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
