export type PriceTier = "全部" | "6以下" | "6-12" | "12以上";

/** 人均筛选：快捷档位或自定义区间（仅正整数，可只填下限或上限） */
export type PriceFilterSelection =
  | { kind: "preset"; tier: PriceTier }
  | { kind: "range"; min?: number; max?: number };

export const PRICE_OPTIONS: readonly PriceTier[] = [
  "全部",
  "6以下",
  "6-12",
  "12以上",
] as const;

export const CATEGORIES = [
  "全部",
  "东南亚菜",
  "中式面点",
  "快餐简餐",
  "川湘菜",
  "新加坡本地",
  "中式炖锅",
  "西餐",
  "健康轻食",
  "韩国料理",
  "深夜食堂",
] as const;

export type Coordinates = { lat: number; lng: number };
export type Coupon = { title: string; desc: string };

/**
 * restaurants 表（Supabase）返回的行结构
 * 说明：前端会额外派生出 location/accent/coordinates 用于 UI 展示（不属于数据库字段）
 */
export type RestaurantRow = {
  id: string;
  name: string;
  university: string;
  sub_location: string;
  category: string;
  price: number;
  rating: number;
  distance: string;
  tags: string[];
  signature_dishes: string;
  image_url: string | null;
  coupons?: unknown;
};

export type Restaurant = RestaurantRow & {
  location: string;
  accent: string;
  coordinates: Coordinates;
  coupons: Coupon[];
};

export function matchesGeoFilter(
  r: RestaurantRow,
  university: string,
  subLocation: string
): boolean {
  const uniOk = university === "全部" || r.university === university;
  const subOk =
    university === "全部" ||
    subLocation === "全部" ||
    r.sub_location === subLocation;
  return uniOk && subOk;
}

export function matchesPriceTier(price: number, tier: PriceTier): boolean {
  if (tier === "全部") return true;
  if (tier === "6以下") return price < 6;
  if (tier === "6-12") return price >= 6 && price <= 12;
  return price > 12;
}

export function matchesPriceFilter(
  restaurantPrice: number,
  sel: PriceFilterSelection
): boolean {
  if (sel.kind === "preset") {
    return matchesPriceTier(restaurantPrice, sel.tier);
  }
  const { min, max } = sel;
  if (min == null && max == null) return true;
  if (min != null && restaurantPrice < min) return false;
  if (max != null && restaurantPrice > max) return false;
  return true;
}

export function isPriceFilterActive(sel: PriceFilterSelection): boolean {
  if (sel.kind === "preset") return sel.tier !== "全部";
  return sel.min != null || sel.max != null;
}

/** 筛选条「价格」按钮展示文案 */
export function priceFilterButtonLabel(sel: PriceFilterSelection): string {
  if (sel.kind === "preset") {
    return sel.tier === "全部" ? "价格" : sel.tier;
  }
  const { min, max } = sel;
  if (min != null && max != null) return `${min}-${max}元`;
  if (min != null) return `${min}元起`;
  if (max != null) return `${max}元内`;
  return "价格";
}

function normalize(raw: string): string {
  return raw.trim().toLowerCase();
}

export function restaurantMatchesSearch(r: RestaurantRow, raw: string): boolean {
  const q = normalize(raw);
  if (!q) return true;

  const hay = [
    r.name,
    r.university,
    r.sub_location,
    r.category,
    r.signature_dishes,
    JSON.stringify(r.coupons ?? []),
    ...(r.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  return hay.includes(q);
}

export function rowToRestaurantUI(row: RestaurantRow): Restaurant {
  const location = `${row.university} · ${row.sub_location}`;
  return {
    ...row,
    location,
    accent: accentForCategory(row.category),
    coordinates: pseudoCoordinatesFromId(row.id),
    coupons: normalizeCoupons(row.coupons),
  };
}

function normalizeCoupons(raw: unknown): Coupon[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const title = String((item as { title?: unknown }).title ?? "").trim();
      const desc = String((item as { desc?: unknown }).desc ?? "").trim();
      if (!title) return null;
      return { title, desc };
    })
    .filter((v): v is Coupon => Boolean(v));
}

export function buildAmapMarkerUrl(
  name: string,
  coords: Coordinates
): string {
  const n = encodeURIComponent(name);
  // 高德 Web 路径规划：目的地坐标为 lng,lat
  return `https://uri.amap.com/navigation?to=${coords.lng},${coords.lat},${n}&mode=walk&policy=0&src=mypage&coordinate=gaode&callnative=0`;
}

function accentForCategory(category: string): string {
  if (category.includes("深夜")) return "from-fuchsia-400 to-rose-500";
  if (category.includes("西餐")) return "from-sky-400 to-indigo-500";
  if (category.includes("健康")) return "from-emerald-400 to-lime-400";
  if (category.includes("韩国")) return "from-rose-400 to-red-500";
  if (category.includes("川湘") || category.includes("麻辣"))
    return "from-orange-400 to-red-500";
  if (category.includes("东南亚")) return "from-amber-400 to-orange-500";
  if (category.includes("新加坡")) return "from-yellow-300 to-orange-400";
  return "from-gray-300 to-gray-500";
}

/**
 * 由于本次数据库结构未包含坐标字段，为了让“地图模式”还能工作，
 * 这里用 id 生成一个稳定的“伪坐标”（落在新加坡附近范围）。
 */
function pseudoCoordinatesFromId(id: string): Coordinates {
  // 简单 hash（稳定、无依赖）
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = (h >>> 0) / 2 ** 32; // 0..1
  const v = (((h >>> 16) ^ h) >>> 0) / 2 ** 32;

  // SG 大概范围：lat 1.25..1.40, lng 103.75..103.95
  const lat = 1.25 + 0.15 * u;
  const lng = 103.75 + 0.2 * v;
  return { lat, lng };
}

