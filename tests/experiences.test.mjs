import assert from "node:assert/strict";
import test from "node:test";
import { EXPERIENCE_MODULES } from "../src/data/experienceModules.ts";
import {
  addExperience,
  formatExperienceDate,
  listExperiences,
  removeExperience,
  updateExperience,
  validateExperienceStore,
} from "../src/lib/experiences.ts";

const baseStore = () => validateExperienceStore({
  version: 1,
  modules: EXPERIENCE_MODULES.map((module) => ({ ...module })),
  entries: [],
});
const entry = (id, moduleId = "school", date = "2024-09-01", content = { text: id }) => ({
  id, moduleId, date, ...content,
});

function freezeDeep(value) {
  if (value && typeof value === "object") {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

test("the shared module registry is valid and has six named modules", () => {
  const store = baseStore();
  assert.equal(store.version, 1);
  assert.deepEqual(store.modules, [
    { id: "school", label: "学校" },
    { id: "company", label: "公司" },
    { id: "internship", label: "实习" },
    { id: "work", label: "工作" },
    { id: "life", label: "生活" },
    { id: "watch", label: "观影" },
  ]);
});

test("title-only, text-only, and image-only entries are valid", () => {
  const store = baseStore();
  store.entries = [
    entry("title", "school", "2024-01-01", { title: "First day" }),
    entry("text", "company", "2024-02-01", { text: "A remembered moment" }),
    entry("image", "life", "2024-03-01", { images: [{ src: "/images/photo.jpg", alt: "" }] }),
  ];
  assert.deepEqual(validateExperienceStore(store), store);
});

test("totally empty entries and malformed images are rejected", () => {
  for (const content of [{}, { title: " ", text: "\n", images: [] }]) {
    assert.throws(() => addExperience(baseStore(), entry("empty", "school", "2024-01-01", content)), /must contain/);
  }
  for (const images of [null, {}, [null], [{ src: " ", alt: "A photo" }], [{ src: "/photo.jpg" }]]) {
    assert.throws(() => addExperience(baseStore(), entry("bad-image", "life", "2024-01-01", { images })), /image/i);
  }
});

test("image sources allow portable root-relative paths and valid absolute HTTP URLs", () => {
  for (const src of [
    "/images/school/memory.jpg", "/images/中文照片.png", "/images/my%20photo.jpg",
    "https://images.example.com/photo.jpg?size=800&format=webp", "http://localhost:3000/photo.jpg",
    "HTTPS://images.example.com/photo.jpg",
  ]) {
    const store = addExperience(baseStore(), entry("photo", "life", "2024-01-01", {
      images: [{ src, alt: "A photo" }],
    }));
    assert.equal(store.entries[0].images[0].src, src);
  }
});

test("invalid image sources fail during validation and CRUD instead of reaching the renderer", () => {
  const valid = addExperience(baseStore(), entry("photo", "life", "2024-01-01", {
    images: [{ src: "/images/photo.jpg", alt: "A photo" }],
  }));
  for (const src of [
    " /images/photo.jpg", "/images/photo.jpg ", "/images/my photo.jpg", "/images/photo.jpg\n",
    "/images/\tphoto.jpg", "/images/\u0000photo.jpg", "/images/\u007fphoto.jpg", "/images/\u0085photo.jpg",
    "//images.example.com/photo.jpg", "/\\images.example.com/photo.jpg", "images/photo.jpg", "./photo.jpg",
    "https://", "http:photo.jpg", "https:///", "https:///example.com/photo.jpg",
    "https:////example.com/photo.jpg", "https://example.com:invalid/photo.jpg",
    "https://example.com\\photo.jpg", "data:image/png;base64,AA==", "blob:https://example.com/photo",
    "javascript:alert(1)", "file:///photo.jpg", "ftp://example.com/photo.jpg",
  ]) {
    const images = [{ src, alt: "A photo" }];
    assert.throws(() => validateExperienceStore({
      ...baseStore(), entries: [entry("photo", "life", "2024-01-01", { images })],
    }), /image at index 0 src must be/);
    assert.throws(() => addExperience(baseStore(), entry("photo", "life", "2024-01-01", { images })), /image at index 0 src must be/);
    assert.throws(() => updateExperience(valid, "photo", { images }), /image at index 0 src must be/);
  }
  assert.equal(valid.entries[0].images[0].src, "/images/photo.jpg");
});

test("the store schema, module IDs, and labels are validated", () => {
  for (const store of [null, [], {}, { version: 2, modules: [], entries: [] }]) {
    assert.throws(() => validateExperienceStore(store), /store/i);
  }
  assert.throws(() => validateExperienceStore({ version: 1, modules: {}, entries: [] }), /arrays/);
  assert.throws(() => validateExperienceStore({ version: 1, modules: [{ id: " ", label: "School" }], entries: [] }), /nonempty/);
  assert.throws(() => validateExperienceStore({ version: 1, modules: [{ id: "school", label: "" }], entries: [] }), /nonempty/);
  assert.throws(() => validateExperienceStore({ version: 1, modules: [
    { id: "school", label: "学校" }, { id: "school", label: "校园" },
  ], entries: [] }), /Duplicate experience module id/);
  assert.throws(() => addExperience(baseStore(), entry("unknown", "missing")), /Unknown experience module/);
  assert.throws(() => listExperiences(baseStore(), "missing"), /Unknown experience module/);
});

test("entry IDs are globally unique, including between modules", () => {
  const store = addExperience(baseStore(), entry("shared", "school"));
  assert.throws(() => addExperience(store, entry("shared", "work")), /Duplicate experience entry id/);
  for (const id of [undefined, null, "", " \t"]) {
    assert.throws(() => addExperience(baseStore(), entry(id)), /id must be a nonempty string/);
  }
});

test("dates are strict real calendar dates with Gregorian leap-year rules", () => {
  for (const date of ["2000-02-29", "2024-02-29", "1900-02-28", "2035-12-31"]) {
    assert.equal(addExperience(baseStore(), entry(date, "life", date)).entries[0].date, date);
    assert.equal(formatExperienceDate(date), date.replaceAll("-", "."));
  }
  for (const date of [undefined, null, "", "2024-1-01", "2024-01-1", "2024-01-01\n",
    "2024-01-01T00:00:00Z", "2024-00-01", "2024-13-01", "2024-01-00",
    "2024-02-30", "2024-04-31", "2025-02-29", "1900-02-29", "2100-02-29", "0000-01-01"]) {
    assert.throws(() => addExperience(baseStore(), { ...entry("bad-date", "life"), date }), /Invalid experience date/);
    assert.throws(() => formatExperienceDate(date), /Invalid experience date/);
  }
});

test("listing sorts across modules and keeps input order for matching dates", () => {
  const store = baseStore();
  store.entries = [
    entry("later", "work", "2027-01-01"),
    entry("z-first", "school", "2024-09-01"),
    entry("earliest", "company", "2022-01-01"),
    entry("a-second", "school", "2024-09-01"),
  ];
  const originalOrder = store.entries.map(({ id }) => id);
  assert.deepEqual(listExperiences(store).map(({ id }) => id), ["earliest", "z-first", "a-second", "later"]);
  assert.deepEqual(listExperiences(store, "school").map(({ id }) => id), ["z-first", "a-second"]);
  assert.deepEqual(listExperiences(store, "internship"), []);
  assert.deepEqual(store.entries.map(({ id }) => id), originalOrder);
});

test("CRUD adds, reads, moves, updates, and removes a record without changing its ID", () => {
  const empty = baseStore();
  const added = addExperience(empty, entry("memory", "internship", "2024-07-01"));
  const updated = updateExperience(added, "memory", {
    moduleId: "work", date: "2025-03-01", title: "Joined the team", text: "A new chapter",
    images: [{ src: "/images/team.jpg", alt: "The team" }],
  });
  assert.deepEqual(listExperiences(updated, "internship"), []);
  assert.deepEqual(listExperiences(updated, "work"), [{
    id: "memory", moduleId: "work", date: "2025-03-01", title: "Joined the team", text: "A new chapter",
    images: [{ src: "/images/team.jpg", alt: "The team" }],
  }]);
  const removed = removeExperience(updated, "memory");
  assert.deepEqual(removed.entries, []);
  assert.equal(updated.entries.length, 1);
  assert.equal(added.entries[0].moduleId, "internship");
  assert.deepEqual(empty.entries, []);
});

test("updates can clear optional content while preserving at least one content field", () => {
  const store = addExperience(baseStore(), entry("memory", "school", "2024-01-01", {
    title: "Title", text: "Text", images: [{ src: "/photo.jpg", alt: "Photo" }],
  }));
  const changed = updateExperience(store, "memory", { title: undefined, text: "Remaining text", images: [] });
  assert.deepEqual(changed.entries[0], {
    id: "memory", moduleId: "school", date: "2024-01-01", text: "Remaining text", images: [],
  });
  assert.throws(
    () => updateExperience(store, "memory", { title: undefined, text: "", images: [] }),
    /must contain/,
  );
});

test("invalid updates and missing IDs fail without changing the store", () => {
  const store = freezeDeep(addExperience(baseStore(), entry("memory")));
  assert.throws(() => updateExperience(store, "memory", { id: "renamed" }), /cannot change its id/);
  assert.throws(() => updateExperience(store, "memory", { moduleId: "missing" }), /Unknown experience module/);
  assert.throws(() => updateExperience(store, "memory", { date: "2025-02-29" }), /Invalid experience date/);
  assert.throws(() => updateExperience(store, "missing", { title: "A title" }), /was not found/);
  assert.throws(() => removeExperience(store, "missing"), /was not found/);
  assert.throws(() => updateExperience(store, "memory", { description: "Wrong field" }), /unsupported field/);
  assert.equal(store.entries[0].text, "memory");
});

test("all helpers leave frozen inputs untouched and returned objects are independent", () => {
  const source = freezeDeep(addExperience(baseStore(), entry("memory", "school", "2024-01-01", {
    text: "Original", images: [{ src: "/photo.jpg", alt: "Original alt" }],
  })));
  const incoming = freezeDeep(entry("new", "life", "2025-01-01"));
  const patch = freezeDeep({ images: [{ src: "/updated.jpg", alt: "Updated alt" }] });
  const validated = validateExperienceStore(source);
  const listed = listExperiences(source);
  const added = addExperience(source, incoming);
  const updated = updateExperience(source, "memory", patch);
  const removed = removeExperience(source, "memory");

  validated.modules[0].label = "Changed label";
  listed[0].images[0].alt = "Changed listed alt";
  added.entries[0].text = "Changed returned text";
  updated.entries[0].images[0].alt = "Changed updated alt";
  removed.modules[0].label = "Changed removed label";

  assert.equal(source.modules[0].label, "学校");
  assert.equal(source.entries[0].text, "Original");
  assert.equal(source.entries[0].images[0].alt, "Original alt");
  assert.equal(patch.images[0].alt, "Updated alt");
  assert.equal(source.entries.length, 1);
});
