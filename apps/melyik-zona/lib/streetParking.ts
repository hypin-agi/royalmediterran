/**
 * Az utcára közvetlenül rögzített parkolási adat értelmezése.
 *
 * Ez a réteg azért kritikus, mert Magyarországon az OSM-ben a fizetős
 * várakozás jóval gyakrabban van az úttestre tagelve (`parking:right:fee=yes`),
 * mint külön zóna-poligonként. Ha csak a poligonokat néznénk, egy valóban
 * fizetős belvárosi utcát is ingyenesnek mutatnánk.
 *
 * Két sémát kezelünk:
 *   - az aktuális street parking séma:  `parking:<oldal>[:<kulcs>]`
 *   - a régebbi lane/condition séma:    `parking:lane:<oldal>`, `parking:condition:<oldal>[:<kulcs>]`
 */

export type SideKey = "right" | "left" | "both";

export type SideLabel = "jobb oldal" | "bal oldal" | "mindkét oldal";

export type ParkingSide = {
  side: SideKey;
  label: SideLabel;
  /** Hogyan áll a kocsi: lane, street_side, on_kerb, no, separate… */
  placement: string | null;
  /** `yes` / `no` / null */
  fee: string | null;
  /** ticket, residents, disc, free, customers… */
  restriction: string | null;
  /** Zónakód, ha az utcára tagelték. */
  zone: string | null;
  maxstay: string | null;
  /** Fizetős időszak, ha az oldalhoz külön tagelték. */
  interval: string | null;
  charge: string | null;
  /** `no @ (Mo-Fr 18:00-08:00)` jellegű feltételes díj. */
  feeConditional: string | null;
};

export type StreetParkingInfo = {
  osmId: number;
  osmUrl: string;
  name: string | null;
  distanceMeters: number;
  sides: ParkingSide[];
  /** Az egész útra vonatkozó tagek. */
  fee: string | null;
  openingHours: string | null;
  charge: string | null;
  maxstay: string | null;
  zone: string | null;
  /** Minden `parking`/`fee`/`zone` kezdetű tag, nyersen. */
  rawTags: Record<string, string>;
};

const SIDE_LABELS: Record<SideKey, SideLabel> = {
  right: "jobb oldal",
  left: "bal oldal",
  both: "mindkét oldal",
};

/**
 * Egy tag-kulcsot bont oldalra és alkulcsra.
 * `parking:right:fee`            → { side: "right", sub: "fee" }
 * `parking:condition:left:zone`  → { side: "left",  sub: "zone" }
 * `parking:lane:both`            → { side: "both",  sub: null   }
 */
function splitSideKey(key: string): { side: SideKey; sub: string | null } | null {
  const parts = key.split(":");
  if (parts[0] !== "parking") return null;

  let index = 1;
  if (parts[index] === "lane" || parts[index] === "condition") index += 1;

  const side = parts[index];
  if (side !== "right" && side !== "left" && side !== "both") return null;

  const sub = parts.slice(index + 1).join(":") || null;
  return { side, sub };
}

const INTERVAL_SUBKEYS = new Set([
  "time_interval",
  "interval",
  "opening_hours",
  "conditional",
]);

function isParkingRelatedKey(key: string): boolean {
  return (
    key === "fee" ||
    key === "maxstay" ||
    key === "charge" ||
    key === "zone" ||
    key.startsWith("parking") ||
    key.startsWith("fee:") ||
    key.startsWith("zone:")
  );
}

export function parseStreetParking(
  tags: Record<string, string>,
  meta: { osmId: number; distanceMeters: number },
): StreetParkingInfo {
  const bySide = new Map<SideKey, ParkingSide>();

  const ensure = (side: SideKey): ParkingSide => {
    const existing = bySide.get(side);
    if (existing) return existing;
    const created: ParkingSide = {
      side,
      label: SIDE_LABELS[side],
      placement: null,
      fee: null,
      restriction: null,
      zone: null,
      maxstay: null,
      interval: null,
      charge: null,
      feeConditional: null,
    };
    bySide.set(side, created);
    return created;
  };

  for (const [key, value] of Object.entries(tags)) {
    const parsed = splitSideKey(key);
    if (!parsed) continue;
    const entry = ensure(parsed.side);
    const sub = parsed.sub;

    if (sub === null) {
      // `parking:right=lane` vagy `parking:condition:right=ticket`
      if (key.includes(":condition:")) entry.restriction ??= value;
      else entry.placement ??= value;
      continue;
    }
    if (sub === "fee") {
      entry.fee ??= value;
      continue;
    }
    if (sub === "fee:conditional") {
      entry.feeConditional ??= value;
      continue;
    }
    if (sub === "restriction" || sub === "condition" || sub === "access") {
      entry.restriction ??= value;
      continue;
    }
    if (sub === "zone" || sub === "restriction:zone") {
      entry.zone ??= value;
      continue;
    }
    if (sub === "maxstay") {
      entry.maxstay ??= value;
      continue;
    }
    if (sub === "charge" || sub === "fee:charge") {
      entry.charge ??= value;
      continue;
    }
    if (INTERVAL_SUBKEYS.has(sub)) {
      entry.interval ??= value;
      continue;
    }
  }

  const sides = [...bySide.values()].filter(
    (side) =>
      side.placement !== null ||
      side.fee !== null ||
      side.restriction !== null ||
      side.zone !== null ||
      side.interval !== null,
  );

  return {
    osmId: meta.osmId,
    osmUrl: `https://www.openstreetmap.org/way/${meta.osmId}`,
    name: tags.name ?? tags["name:hu"] ?? null,
    distanceMeters: meta.distanceMeters,
    sides,
    fee: tags.fee ?? null,
    openingHours:
      tags["parking:opening_hours"] ??
      tags["fee:conditional"] ??
      tags.opening_hours ??
      null,
    charge: tags.charge ?? null,
    maxstay: tags.maxstay ?? null,
    zone: tags["parking:zone"] ?? tags["zone:parking"] ?? null,
    rawTags: Object.fromEntries(
      Object.entries(tags).filter(([key]) => isParkingRelatedKey(key)),
    ),
  };
}

/** `no @ (Mo-Fr 18:00-08:00)` → a zárójelben lévő időkifejezés. */
export function conditionalInterval(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/@\s*\(([^)]+)\)/);
  return match ? match[1].trim() : null;
}

export type StreetVerdict = {
  /** true = az utca adata szerint fizetős a várakozás. */
  paid: boolean | null;
  /** Ahonnan a fizetős voltra következtettünk. */
  evidence: string[];
  /** Az idősáv-kifejezés, amit ki lehet értékelni. */
  hoursExpression: string | null;
  zoneCode: string | null;
  charge: string | null;
  maxstay: string | null;
};

const PAID_RESTRICTIONS = new Set(["ticket", "charge", "fee", "disc_or_ticket"]);
const FREE_RESTRICTIONS = new Set(["free", "none"]);

/**
 * Összegzi, hogy az utca adata alapján fizetős-e a várakozás.
 * Ha egyik oldal fizetős, azt jelezzük — inkább figyelmeztetünk feleslegesen,
 * mint hogy egy fizetős szakaszt ingyenesnek mutassunk.
 */
export function summariseStreet(street: StreetParkingInfo): StreetVerdict {
  const evidence: string[] = [];
  let paid: boolean | null = null;
  let hoursExpression: string | null = null;
  let zoneCode: string | null = street.zone;
  let charge: string | null = street.charge;
  let maxstay: string | null = street.maxstay;

  const markPaid = (why: string) => {
    paid = true;
    evidence.push(why);
  };

  if (street.fee === "yes") markPaid("az útra `fee=yes` van tagelve");

  for (const side of street.sides) {
    if (side.fee === "yes") markPaid(`${side.label}: \`fee=yes\``);
    else if (side.restriction && PAID_RESTRICTIONS.has(side.restriction))
      markPaid(`${side.label}: \`${side.restriction}\``);
    else if (side.fee === "no" && paid === null) paid = false;
    else if (side.restriction && FREE_RESTRICTIONS.has(side.restriction) && paid === null)
      paid = false;

    hoursExpression ??= side.interval ?? conditionalInterval(side.feeConditional);
    zoneCode ??= side.zone;
    charge ??= side.charge;
    maxstay ??= side.maxstay;
  }

  hoursExpression ??=
    street.openingHours ?? conditionalInterval(street.openingHours);

  return { paid, evidence, hoursExpression, zoneCode, charge, maxstay };
}
