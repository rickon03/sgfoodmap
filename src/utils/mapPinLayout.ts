import type { Coordinates } from "../data/restaurants";

export type LatLngBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function computeBounds(
  items: { coordinates: Coordinates }[]
): LatLngBounds {
  if (items.length === 0) {
    return { minLat: 0, maxLat: 1, minLng: 0, maxLng: 1 };
  }
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const it of items) {
    const { lat, lng } = it.coordinates;
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }
  const padLat = Math.max((maxLat - minLat) * 0.2, 0.0015);
  const padLng = Math.max((maxLng - minLng) * 0.2, 0.0015);
  return {
    minLat: minLat - padLat,
    maxLat: maxLat + padLat,
    minLng: minLng - padLng,
    maxLng: maxLng + padLng,
  };
}

/** 将经纬度映射为地图容器内的百分比（0–100，含边距），用于布局判断 */
export function coordsToPercentValues(
  coords: Coordinates,
  b: LatLngBounds
): { leftPct: number; topPct: number } {
  const latSpan = b.maxLat - b.minLat || 1;
  const lngSpan = b.maxLng - b.minLng || 1;
  const pad = 7;
  const leftPct = pad + ((coords.lng - b.minLng) / lngSpan) * (100 - 2 * pad);
  const topPct = pad + ((b.maxLat - coords.lat) / latSpan) * (100 - 2 * pad);
  return { leftPct, topPct };
}

/** 将经纬度映射为地图容器内的百分比，便于 absolute 定位锚点 */
export function coordsToPercent(
  coords: Coordinates,
  b: LatLngBounds
): { left: string; top: string } {
  const { leftPct, topPct } = coordsToPercentValues(coords, b);
  return { left: `${leftPct}%`, top: `${topPct}%` };
}

/** 气泡相对图钉：仅决定在上/下（水平始终相对图钉居中，避免与 CSS transform 冲突） */
export function miniPopPlacement(topPct: number): {
  vertical: "above" | "below";
} {
  const nearTop = topPct < 28;
  const nearBottom = topPct > 70;

  let vertical: "above" | "below" = "above";
  if (nearTop) vertical = "below";
  else if (nearBottom) vertical = "above";

  return { vertical };
}
