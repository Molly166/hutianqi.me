export type LandmarkDefinition = {
  id: string;
  type: "school" | "company" | "journey";
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
