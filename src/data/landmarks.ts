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
  title: "South-Central Minzu University",
  landmark: "Twin-Tower Library",
  href: "/school/",
} satisfies LandmarkDefinition;

export const geetestLandmark = {
  id: "company-geetest",
  type: "company",
  title: "GeeTest",
  landmark: "Wuda Hangyu Phase II · B3",
  href: "/company/geetest/",
} satisfies LandmarkDefinition;

export const byteDanceShenzhenBayLandmark = {
  id: "company-bytedance-shenzhen-bay",
  type: "company",
  title: "ByteDance",
  landmark: "Shenzhen Bay Office",
  href: "/company/bytedance-shenzhen-bay/",
} satisfies LandmarkDefinition;

export const cinemaLandmark = {
  id: "interest-cinema",
  type: "interest",
  title: "Cinema",
  landmark: "Watch Journal",
  href: "/cinema/",
} satisfies LandmarkDefinition;

export const mapLandmarks = [
  schoolLandmark,
  geetestLandmark,
  byteDanceShenzhenBayLandmark,
  cinemaLandmark,
] as const satisfies readonly LandmarkDefinition[];
