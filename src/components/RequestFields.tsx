import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STREETS } from "@/lib/requests";
import { z } from "zod";

export const requestFieldsSchema = z.object({
  street: z.string().trim().min(1, "Укажите улицу").max(100),
  house: z.string().trim().min(1, "Укажите номер дома").max(10),
  entrance: z.string().trim().max(5).regex(/^\d*$/, "Только цифры"),
  floor: z.string().trim().max(5).regex(/^-?\d*$/, "Только цифры"),
  apartment: z.string().trim().max(10),
  applicant: z.string().trim().min(2, "Укажите фамилию и имя").max(120),
  phone: z
    .string()
    .trim()
    .min(1, "Укажите телефон")
    .refine((v) => v.replace(/\D/g, "").length >= 10 && v.replace(/\D/g, "").length <= 11, "Введите номер полностью"),
  description: z.string().trim().min(5, "Опишите проблему подробнее").max(2000),
});

export type RequestFieldValues = z.infer<typeof requestFieldsSchema>;

export const emptyFields: RequestFieldValues = {
  street: "",
  house: "",
  entrance: "",
  floor: "",
  apartment: "",
  applicant: "",
  phone: "",
  description: "",
};

/** Маска телефона: +7 (XXX) XXX-XX-XX */
export function formatPhone(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = "7" + digits.slice(1);
  if (digits.length > 0 && !digits.startsWith("7")) digits = "7" + digits;
  digits = digits.slice(0, 11);
  if (!digits) return "";
  let out = "+7";
  if (digits.length > 1) out += " (" + digits.slice(1, 4);
  if (digits.length >= 4) out += ")";
  if (digits.length > 4) out += " " + digits.slice(4, 7);
  if (digits.length > 7) out += "-" + digits.slice(7, 9);
  if (digits.length > 9) out += "-" + digits.slice(9, 11);
  return out;
}

type Errors = Partial<Record<keyof RequestFieldValues, string>>;

interface Props {
  values: RequestFieldValues;
  errors: Errors;
  onChange: (patch: Partial<RequestFieldValues>) => void;
  idPrefix?: string;
}

function FieldError({ msg }: { msg?: string | undefined }) {
  return msg ? <p className="text-xs text-destructive">{msg}</p> : null;
}

export function RequestFields({ values, errors, onChange, idPrefix = "rq" }: Props) {
  const id = (k: string) => `${idPrefix}-${k}`;
  const isKnownStreet = STREETS.includes(values.street);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-2">
          <Label htmlFor={id("street")}>Улица</Label>
          <Select
            value={isKnownStreet ? values.street : values.street ? "__other" : ""}
            onValueChange={(v) => onChange({ street: v === "__other" ? " " : v })}
          >
            <SelectTrigger id={id("street")} aria-invalid={!!errors.street}>
              <SelectValue placeholder="Выберите улицу" />
            </SelectTrigger>
            <SelectContent>
              {STREETS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
              <SelectItem value="__other">Другая улица…</SelectItem>
            </SelectContent>
          </Select>
          {!isKnownStreet && values.street !== "" && (
            <Input
              placeholder="Введите название улицы"
              value={values.street.trim()}
              onChange={(e) => onChange({ street: e.target.value || " " })}
              autoFocus
            />
          )}
          <FieldError msg={errors.street} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("house")}>Номер дома</Label>
          <Input
            id={id("house")}
            value={values.house}
            onChange={(e) => onChange({ house: e.target.value })}
            placeholder="12А"
            aria-invalid={!!errors.house}
          />
          <FieldError msg={errors.house} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor={id("entrance")}>Подъезд</Label>
          <Input
            id={id("entrance")}
            type="number"
            inputMode="numeric"
            min={1}
            value={values.entrance}
            onChange={(e) => onChange({ entrance: e.target.value })}
            aria-invalid={!!errors.entrance}
          />
          <FieldError msg={errors.entrance} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("floor")}>Этаж</Label>
          <Input
            id={id("floor")}
            type="number"
            inputMode="numeric"
            value={values.floor}
            onChange={(e) => onChange({ floor: e.target.value })}
            aria-invalid={!!errors.floor}
          />
          <FieldError msg={errors.floor} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("apartment")}>Квартира</Label>
          <Input
            id={id("apartment")}
            inputMode="numeric"
            value={values.apartment}
            onChange={(e) => onChange({ apartment: e.target.value })}
            aria-invalid={!!errors.apartment}
          />
          <FieldError msg={errors.apartment} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={id("applicant")}>Фамилия и имя заявителя</Label>
          <Input
            id={id("applicant")}
            value={values.applicant}
            onChange={(e) => onChange({ applicant: e.target.value })}
            placeholder="Иванова Мария"
            autoComplete="name"
            aria-invalid={!!errors.applicant}
          />
          <FieldError msg={errors.applicant} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("phone")}>Телефон</Label>
          <Input
            id={id("phone")}
            type="tel"
            inputMode="tel"
            value={values.phone}
            onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
            placeholder="+7 (___) ___-__-__"
            autoComplete="tel"
            aria-invalid={!!errors.phone}
          />
          <FieldError msg={errors.phone} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={id("description")}>Суть заявки</Label>
        <Textarea
          id={id("description")}
          rows={4}
          value={values.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Опишите проблему: что не работает, где, с какого времени"
          aria-invalid={!!errors.description}
        />
        <FieldError msg={errors.description} />
      </div>
    </div>
  );
}

export function validateFields(values: RequestFieldValues): { ok: true; data: RequestFieldValues } | { ok: false; errors: Errors } {
  const res = requestFieldsSchema.safeParse(values);
  if (res.success) return { ok: true, data: res.data };
  const errors: Errors = {};
  for (const issue of res.error.issues) {
    const key = issue.path[0] as keyof RequestFieldValues;
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
