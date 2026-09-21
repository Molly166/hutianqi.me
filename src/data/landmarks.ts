export type LandmarkDefinition = {
  id: string;
  type: "school" | "company" | "interest" | "journey";
  title: string;
  landmark: string;
  href: string;
};

export const schoolLandmark = {
  id: "school-scuec",
  type: "school",
  title: "中南民族大学",
  landmark: "双子塔图书馆",
  href: "/school/",
} satisfies LandmarkDefinition;

export const geetestLandmark = {
  id: "company-geetest",
  type: "company",
  title: "极验",
  landmark: "武大航域二期 B3",
  href: "/company/geetest/",
} satisfies LandmarkDefinition;

export const byteDanceShenzhenBayLandmark = {
  id: "company-bytedance-shenzhen-bay",
  type: "company",
  title: "字节跳动",
  landmark: "深圳湾创新科技工区",
  href: "/company/bytedance-shenzhen-bay/",
} satisfies LandmarkDefinition;

export const cinemaLandmark = {
  id: "interest-cinema",
  type: "interest",
  title: "影院",
  landmark: "观影记录",
  href: "/cinema/",
} satisfies LandmarkDefinition;

export const mapLandmarks = [
  schoolLandmark,
  geetestLandmark,
  byteDanceShenzhenBayLandmark,
  cinemaLandmark,
] as const satisfies readonly LandmarkDefinition[];
