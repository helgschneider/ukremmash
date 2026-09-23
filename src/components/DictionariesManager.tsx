import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { DICT_KEYS, DICT_LABELS, type Dictionaries, type DictKey, type Dictionary } from "@/lib/dictionaries";

interface Props {
  dicts: Dictionaries;
  onChange: (next: Dictionaries) => void;
}

export function DictionariesManager({ dicts, onChange }: Props) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Управление справочниками</h2>
        <p className="text-sm text-muted-foreground">
          Значения справочников превращают поля формы в выпадающие списки. Отмеченное значение подставляется в новую
          заявку автоматически. Если справочник пуст, поле остаётся обычным вводом.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {DICT_KEYS.map((k) => (
          <DictCard key={k} dictKey={k} dict={dicts[k]} onChange={(d) => onChange({ ...dicts, [k]: d })} />
        ))}
      </div>
    </div>
  );
}

function DictCard({ dictKey, dict, onChange }: { dictKey: DictKey; dict: Dictionary; onChange: (d: Dictionary) => void }) {
  const [draft, setDraft] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editVal, setEditVal] = useState("");
  const { title, placeholder } = DICT_LABELS[dictKey];

  const add = () => {
    const v = draft.trim().slice(0, 100);
    if (!v) return;
    if (dict.values.includes(v)) return toast.error("Такое значение уже есть");
    onChange({ ...dict, values: [...dict.values, v] });
    setDraft("");
  };

  const saveEdit = (i: number) => {
    const v = editVal.trim().slice(0, 100);
    if (!v) return toast.error("Значение не может быть пустым");
    const old = dict.values[i];
    if (v !== old && dict.values.includes(v)) return toast.error("Такое значение уже есть");
    const values = dict.values.map((x, j) => (j === i ? v : x));
    onChange({ values, defaultValue: dict.defaultValue === old ? v : dict.defaultValue });
    setEditIdx(null);
  };

  const remove = (i: number) => {
    const old = dict.values[i];
    onChange({
      values: dict.values.filter((_, j) => j !== i),
      defaultValue: dict.defaultValue === old ? null : dict.defaultValue,
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          {dict.values.length} знач. · по умолчанию: {dict.defaultValue ?? "не выбрано"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} />
          <Button type="submit" size="icon" aria-label="Добавить">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        {dict.values.length === 0 ? (
          <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
            Справочник пуст — поле в форме будет обычным вводом
          </p>
        ) : (
          <RadioGroup
            value={dict.defaultValue ?? ""}
            onValueChange={(v) => onChange({ ...dict, defaultValue: v })}
            className="max-h-72 gap-0 overflow-y-auto rounded-md border"
          >
            {dict.values.map((v, i) => (
              <div key={v} className="flex items-center gap-2 border-b px-3 py-2 last:border-b-0">
                <RadioGroupItem value={v} id={`${dictKey}-${i}`} aria-label={`По умолчанию: ${v}`} />
                {editIdx === i ? (
                  <>
                    <Input
                      value={editVal}
                      onChange={(e) => setEditVal(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(i);
                        if (e.key === "Escape") setEditIdx(null);
                      }}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => saveEdit(i)} aria-label="Сохранить">
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditIdx(null)} aria-label="Отмена">
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <label htmlFor={`${dictKey}-${i}`} className="min-w-0 flex-1 truncate text-sm">
                      {v}
                      {dict.defaultValue === v && (
                        <span className="ml-2 text-xs text-muted-foreground">(по умолчанию)</span>
                      )}
                    </label>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditIdx(i);
                        setEditVal(v);
                      }}
                      aria-label="Редактировать"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => remove(i)}
                      aria-label="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </RadioGroup>
        )}
        {dict.defaultValue && (
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => onChange({ ...dict, defaultValue: null })}>
            Сбросить значение по умолчанию
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
