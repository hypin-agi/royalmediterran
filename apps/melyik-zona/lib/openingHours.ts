/**
 * `opening_hours` kiértékelő — szándékosan a szintaxis részhalmazára.
 *
 * A magyar parkolási zónák OSM-ben szinte kivétel nélkül egyszerű alakot
 * használnak (`Mo-Fr 08:00-18:00`, `Mo-Sa 08:00-20:00; Su off`, `24/7`),
 * ezért nem a teljes specifikációt implementáljuk. Amit nem értünk biztosan,
 * arra `supported: false`-t adunk vissza, és a felület a nyers kifejezést
 * mutatja — jobb bevallani, hogy nem tudjuk, mint rosszul tippelni.
 */

export type HoursVerdict = {
  /** Sikerült-e értelmezni a kifejezést. */
  supported: boolean;
  /** true = a fizetős időszak most aktív. null, ha nem tudjuk. */
  activeNow: boolean | null;
  /** A mai napra érvényes idősávok emberi formában, pl. ["08:00–18:00"]. */
  todayRanges: string[];
  /** Mikor vált az állapot ma, pl. "18:00". null, ha ma már nincs váltás. */
  nextChange: string | null;
  isPublicHoliday: boolean;
  /** 0 = hétfő … 6 = vasárnap, Europe/Budapest szerint. */
  weekday: number;
  /** Helyi idő percben éjfél óta. */
  minutesNow: number;
  localDate: string;
};

const DAY_TOKENS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"] as const;
const DAY_NAMES_HU = [
  "hétfő",
  "kedd",
  "szerda",
  "csütörtök",
  "péntek",
  "szombat",
  "vasárnap",
];

export function huWeekdayName(weekday: number): string {
  return DAY_NAMES_HU[weekday] ?? "";
}

/** Húsvétvasárnap (gregorián, anonim algoritmus). */
export function easterSunday(year: number): { month: number; day: number } {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return { month, day };
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return isoOf(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
  );
}

/**
 * Magyarországi munkaszüneti napok. A fix dátumok törvényben rögzítettek, a
 * mozgó ünnepek húsvéthoz kötöttek. Az áthelyezett munkanapokat (a kormány
 * évente rendeletben hirdeti ki) nem ismerjük — ezek a parkolás szempontjából
 * nem munkaszüneti napok, csak hosszú hétvégét alakítanak ki.
 */
export function hungarianPublicHolidays(year: number): Set<string> {
  const easter = easterSunday(year);
  const easterIso = isoOf(year, easter.month, easter.day);

  return new Set([
    isoOf(year, 1, 1), // újév
    isoOf(year, 3, 15), // nemzeti ünnep
    addDaysIso(easterIso, -2), // nagypéntek
    easterIso, // húsvétvasárnap
    addDaysIso(easterIso, 1), // húsvéthétfő
    isoOf(year, 5, 1), // a munka ünnepe
    addDaysIso(easterIso, 49), // pünkösdvasárnap
    addDaysIso(easterIso, 50), // pünkösdhétfő
    isoOf(year, 8, 20), // államalapítás
    isoOf(year, 10, 23), // nemzeti ünnep
    isoOf(year, 11, 1), // mindenszentek
    isoOf(year, 12, 25),
    isoOf(year, 12, 26),
  ]);
}

export type LocalNow = {
  /** 0 = hétfő … 6 = vasárnap */
  weekday: number;
  minutes: number;
  iso: string;
};

/** Az aktuális budapesti helyi idő — a szerver időzónájától függetlenül. */
export function localNowBudapest(reference: Date = new Date()): LocalNow {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Budapest",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(reference).map((p) => [p.type, p.value]),
  );

  const weekdayIndex = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(
    parts.weekday ?? "",
  );

  return {
    weekday: weekdayIndex >= 0 ? weekdayIndex : 0,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
    iso: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

type TimeRange = { from: number; to: number };

type Rule = {
  /** Mely napokra vonatkozik (0–6). Üres halmaz = minden napra. */
  days: Set<number>;
  appliesToHolidays: boolean;
  /** Csak munkaszüneti napokra vonatkozó szabály (`PH off`). */
  holidayOnly: boolean;
  closed: boolean;
  ranges: TimeRange[];
};

function parseTime(token: string): number | null {
  const match = token.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function parseDaySelector(token: string): Set<number> | null {
  const days = new Set<number>();
  for (const part of token.split(",")) {
    const range = part.trim().match(/^([A-Za-z]{2})(?:-([A-Za-z]{2}))?$/);
    if (!range) return null;
    const from = DAY_TOKENS.indexOf(range[1] as (typeof DAY_TOKENS)[number]);
    if (from < 0) return null;
    if (!range[2]) {
      days.add(from);
      continue;
    }
    const to = DAY_TOKENS.indexOf(range[2] as (typeof DAY_TOKENS)[number]);
    if (to < 0) return null;
    // A hét körbefordulhat (pl. Sa-Mo).
    for (let i = from; ; i = (i + 1) % 7) {
      days.add(i);
      if (i === to) break;
    }
  }
  return days;
}

function parseRule(raw: string): Rule | null {
  const text = raw.trim();
  if (!text) return null;

  if (text === "24/7") {
    return {
      days: new Set(),
      appliesToHolidays: true,
      holidayOnly: false,
      closed: false,
      ranges: [{ from: 0, to: 24 * 60 }],
    };
  }

  const tokens = text.split(/\s+/);
  const days = new Set<number>();
  let sawDaySelector = false;
  let holidayOnly = false;
  let appliesToHolidays = false;
  let closed = false;
  const ranges: TimeRange[] = [];

  for (const token of tokens) {
    if (token === "PH") {
      holidayOnly = true;
      appliesToHolidays = true;
      continue;
    }
    if (token === "off" || token === "closed") {
      closed = true;
      continue;
    }
    if (/^[A-Za-z]{2}(-[A-Za-z]{2})?(,[A-Za-z]{2}(-[A-Za-z]{2})?)*$/.test(token)) {
      const parsed = parseDaySelector(token);
      if (!parsed) return null;
      for (const day of parsed) days.add(day);
      sawDaySelector = true;
      continue;
    }
    // Idősávok, vesszővel elválasztva.
    if (/^\d{1,2}:\d{2}-\d{1,2}:\d{2}(,\d{1,2}:\d{2}-\d{1,2}:\d{2})*$/.test(token)) {
      for (const chunk of token.split(",")) {
        const [fromToken, toToken] = chunk.split("-");
        const from = parseTime(fromToken);
        const to = parseTime(toToken);
        if (from === null || to === null) return null;
        ranges.push({ from, to });
      }
      continue;
    }
    // Ismeretlen token (hónap-szelektor, `sunrise`, megjegyzés stb.).
    return null;
  }

  if (!closed && ranges.length === 0) return null;

  return {
    days: sawDaySelector ? days : new Set(),
    appliesToHolidays,
    holidayOnly,
    closed,
    ranges,
  };
}

function ruleMatchesDay(
  rule: Rule,
  weekday: number,
  isHoliday: boolean,
): boolean {
  if (rule.holidayOnly) return isHoliday;
  if (rule.days.size === 0) return true;
  return rule.days.has(weekday);
}

function formatMinutes(minutes: number): string {
  const capped = minutes % (24 * 60);
  const h = Math.floor(capped / 60);
  const m = capped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Kiértékeli az `opening_hours` kifejezést a megadott pillanatra.
 * A parkolásnál az "open" azt jelenti, hogy a fizetési kötelezettség él.
 */
export function evaluateHours(
  expression: string | null | undefined,
  reference: Date = new Date(),
): HoursVerdict {
  const now = localNowBudapest(reference);
  const holidays = hungarianPublicHolidays(Number(now.iso.slice(0, 4)));
  const isPublicHoliday = holidays.has(now.iso);

  const base: HoursVerdict = {
    supported: false,
    activeNow: null,
    todayRanges: [],
    nextChange: null,
    isPublicHoliday,
    weekday: now.weekday,
    minutesNow: now.minutes,
    localDate: now.iso,
  };

  if (!expression || !expression.trim()) return base;

  const rules: Rule[] = [];
  for (const chunk of expression.split(";")) {
    if (!chunk.trim()) continue;
    const rule = parseRule(chunk);
    if (!rule) return base; // egyetlen nem értett szabály → nem tippelünk
    rules.push(rule);
  }
  if (rules.length === 0) return base;

  // A későbbi szabály felülírja a korábbit az adott napra (OSM-szemantika).
  let effective: Rule | null = null;
  for (const rule of rules) {
    if (ruleMatchesDay(rule, now.weekday, isPublicHoliday)) effective = rule;
  }

  // Ha van `PH off`-szerű szabály, de ma nem ünnep, akkor a napi szabály él.
  if (!effective) {
    return { ...base, supported: true, activeNow: false, todayRanges: [] };
  }

  if (effective.closed) {
    return { ...base, supported: true, activeNow: false, todayRanges: [] };
  }

  const todayRanges = effective.ranges.map(
    (range) => `${formatMinutes(range.from)}–${formatMinutes(range.to)}`,
  );

  let activeNow = false;
  let nextChange: number | null = null;

  for (const range of effective.ranges) {
    const spansMidnight = range.to <= range.from;
    const inRange = spansMidnight
      ? now.minutes >= range.from || now.minutes < range.to
      : now.minutes >= range.from && now.minutes < range.to;

    if (inRange) {
      activeNow = true;
      nextChange = range.to;
      break;
    }
    if (now.minutes < range.from) {
      nextChange = nextChange === null ? range.from : Math.min(nextChange, range.from);
    }
  }

  return {
    ...base,
    supported: true,
    activeNow,
    todayRanges,
    nextChange: nextChange === null ? null : formatMinutes(nextChange),
  };
}
