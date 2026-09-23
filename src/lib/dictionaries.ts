import { STREETS } from "@/lib/requests";

export type DictKey = "street" | "house" | "entrance" | "floor";

export interface Dictionary {
  values: string[];
  defaultValue: string | null;
}

export type Dictionaries = Record<DictKey, Dictionary>;

export const DICT_LABELS: Record<DictKey, { title: string; placeholder: string }> = {
  street: { title: "Улицы", placeholder: "Название улицы" },
  house: { title: "Номера домов", placeholder: "Например, 12А" },
  entrance: { title: "Номера подъездов", placeholder: "Например, 1" },
  floor: { title: "Номера этажей", placeholder: "Например, 3" },
};

export const DICT_KEYS: DictKey[] = ["street", "house", "entrance", "floor"];
export const DICTS_KEY = "electro-requests:dicts:v1";

export const defaultDictionaries = (): Dictionaries => ({
  street: { values: [...STREETS], defaultValue: null },
  house: { values: [], defaultValue: null },
  entrance: { values: [], defaultValue: null },
  floor: { values: [], defaultValue: null },
});

export function loadDictionaries(): Dictionaries {
  if (typeof window === "undefined") return defaultDictionaries();
  try {
    const raw = window.localStorage.getItem(DICTS_KEY);
    if (!raw) return defaultDictionaries();
    const parsed = JSON.parse(raw) as Partial<Dictionaries>;
    const base = defaultDictionaries();
    for (const k of DICT_KEYS) {
      const d = parsed[k];
      if (d && Array.isArray(d.values)) {
        base[k] = {
          values: d.values.filter((v) => typeof v === "string"),
          defaultValue: d.defaultValue && d.values.includes(d.defaultValue) ? d.defaultValue : null,
        };
      }
    }
    return base;
  } catch {
    return defaultDictionaries();
  }
}

export function saveDictionaries(d: Dictionaries) {
  window.localStorage.setItem(DICTS_KEY, JSON.stringify(d));
}
