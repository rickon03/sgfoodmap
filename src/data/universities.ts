/** 一级：高校 */
export const UNIVERSITIES = [
  "全部",
  "南洋理工大学 (NTU)",
  "新加坡国立大学 (NUS)",
] as const;

export type University = (typeof UNIVERSITIES)[number];

/** 二级：具体位置（按高校联动） */
export const SUB_LOCATIONS_BY_UNIVERSITY: Record<
  Exclude<University, "全部">,
  readonly string[]
> = {
  "南洋理工大学 (NTU)": ["全部", "Canteen 2", "North Spine", "South Spine", "宿舍区"],
  "新加坡国立大学 (NUS)": [
    "全部",
    "UTown",
    "肯特岗 (Kent Ridge)",
    "科学园 (Science)",
    "PGPR",
  ],
};

export function getSubLocationOptions(
  university: University
): readonly string[] {
  if (university === "全部") return ["全部"];
  return SUB_LOCATIONS_BY_UNIVERSITY[university];
}
