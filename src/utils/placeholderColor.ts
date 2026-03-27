/**
 * 根据餐厅名称生成稳定的柔和占位底色与图标色（马卡龙/莫兰迪向），刷新不变。
 */
const PALETTE = [
  { bg: "bg-red-50", icon: "text-red-400" },
  { bg: "bg-blue-50", icon: "text-blue-400" },
  { bg: "bg-green-50", icon: "text-green-400" },
  { bg: "bg-orange-50", icon: "text-orange-400" },
  { bg: "bg-purple-50", icon: "text-purple-400" },
  { bg: "bg-teal-50", icon: "text-teal-400" },
] as const;

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) + name.length * 17;
}

export function getPlaceholderColor(name: string): (typeof PALETTE)[number] {
  const idx = hashName(name) % PALETTE.length;
  return PALETTE[idx]!;
}
