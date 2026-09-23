import { useState, type FormEvent } from "react";
import { Send, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RequestFields, defaultsFromDicts, validateFields, type RequestFieldValues } from "@/components/RequestFields";
import type { Dictionaries } from "@/lib/dictionaries";

interface Props {
  onSubmit: (data: RequestFieldValues) => void;
  dicts: Dictionaries;
}

export function NewRequestForm({ onSubmit, dicts }: Props) {
  const emptyFields = defaultsFromDicts(dicts);
  const [values, setValues] = useState<RequestFieldValues>(emptyFields);
  const [errors, setErrors] = useState<Partial<Record<keyof RequestFieldValues, string>>>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const res = validateFields(values);
    if (!res.ok) {
      setErrors(res.errors);
      toast.error("Проверьте заполнение формы");
      return;
    }
    onSubmit(res.data);
    setValues(emptyFields);
    setErrors({});
    toast.success("Заявка отправлена", { description: "Дата и время созданы автоматически." });
  };

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Новая заявка</CardTitle>
        <CardDescription>
          Заполните адрес, контакты и опишите проблему. Дата и время создания зафиксируются автоматически.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <RequestFields
            values={values}
            errors={errors}
            onChange={(patch) => {
              setValues((v) => ({ ...v, ...patch }));
              setErrors((er) => {
                const next = { ...er };
                for (const k of Object.keys(patch) as (keyof RequestFieldValues)[]) delete next[k];
                return next;
              });
            }}
            idPrefix="new"
            dicts={dicts}
          />
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValues(emptyFields);
                setErrors({});
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Очистить
            </Button>
            <Button type="submit">
              <Send className="h-4 w-4" />
              Отправить заявку
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
