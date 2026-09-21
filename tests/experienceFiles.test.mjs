import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

import { EXPERIENCE_MODULES } from "../src/data/experienceModules.ts";
import {
  DEFAULT_EXPERIENCES_ROOT,
  experienceDateFromFileName,
  experienceFileData,
  experienceFilePath,
  experienceIdFromFileName,
  loadExperienceFiles,
  loadExperienceStore,
  parseExperienceFile,
  serializeExperienceFile,
  validateExperienceFileName,
} from "../src/lib/experienceFiles.ts";
import { listExperiences } from "../src/lib/experiences.ts";

function temporaryRoot(t) {
  const root = mkdtempSync(join(tmpdir(), "hutianqi-experiences-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

function writeJson(root, moduleId, fileName, data) {
  const directory = join(root, moduleId);
  mkdirSync(directory, { recursive: true });
  const filePath = join(directory, fileName);
  writeFileSync(filePath, typeof data === "string" ? data : `${JSON.stringify(data)}\n`);
  return filePath;
}

test("module metadata and the default source root are stable", () => {
  assert.deepEqual(EXPERIENCE_MODULES, [
    { id: "school", label: "学校" },
    { id: "company", label: "公司" },
    { id: "internship", label: "实习" },
    { id: "work", label: "工作" },
    { id: "life", label: "生活" },
    { id: "watch", label: "观影" },
  ]);
  assert.equal(DEFAULT_EXPERIENCES_ROOT, resolve(process.cwd(), "src/data/experiences"));
});

test("known module directories load in module order and chronological filename-stem order", (t) => {
  const root = temporaryRoot(t);
  writeJson(root, "school", "2023-12-31.json", {
    id: "school-2023-12-31", date: "2023-12-31", title: "Earlier",
  });
  writeJson(root, "school", "2024-05-01-02.json", {
    id: "school-2024-05-01-02", date: "2024-05-01", title: "Third",
  });
  writeJson(root, "school", "2024-05-01.json", {
    id: "school-2024-05-01", date: "2024-05-01", title: "First",
  });
  writeJson(root, "school", "2024-05-01-01.json", {
    id: "school-2024-05-01-01", date: "2024-05-01", text: "Second",
  });
  writeJson(root, "company", "2024-05-01.json", {
    id: "company-2024-05-01", date: "2024-05-01", images: [{ src: "/company.jpg", alt: "" }],
  });
  writeJson(root, "life", "2025-01-01.json", {
    id: "life-2025-01-01", date: "2025-01-01", text: "Later",
  });

  const records = loadExperienceFiles(root);
  assert.deepEqual(records.map(({ moduleId, fileName, entry }) => [moduleId, fileName, entry.id]), [
    ["school", "2023-12-31.json", "school-2023-12-31"],
    ["school", "2024-05-01.json", "school-2024-05-01"],
    ["school", "2024-05-01-01.json", "school-2024-05-01-01"],
    ["school", "2024-05-01-02.json", "school-2024-05-01-02"],
    ["company", "2024-05-01.json", "company-2024-05-01"],
    ["life", "2025-01-01.json", "life-2025-01-01"],
  ]);
  assert.ok(records.every(({ path }) => path.startsWith(`${resolve(root)}/`)));

  const store = loadExperienceStore(root);
  assert.deepEqual(store.modules, EXPERIENCE_MODULES);
  assert.deepEqual(store.entries.map(({ id }) => id), records.map(({ entry }) => entry.id));
  assert.deepEqual(listExperiences(store).map(({ id }) => id), [
    "school-2023-12-31", "school-2024-05-01", "school-2024-05-01-01",
    "school-2024-05-01-02", "company-2024-05-01", "life-2025-01-01",
  ]);
});

test("missing module directories are empty; dotfiles, non-JSON files, and unknown modules are ignored", (t) => {
  const root = temporaryRoot(t);
  writeJson(root, "school", ".ignored.json", "not json");
  writeJson(root, "school", "notes.txt", "not json");
  writeJson(root, "unknown", "broken.json", "not json");
  mkdirSync(join(root, "school", "empty-folder"), { recursive: true });
  writeFileSync(join(root, "school", "empty-folder", "notes.md"), "ignored");

  assert.deepEqual(loadExperienceFiles(root), []);
  assert.deepEqual(loadExperienceStore(root).entries, []);
});

test("event parsing infers moduleId and serialization never stores it", () => {
  const source = JSON.stringify({
    id: "life-2024-02-29",
    date: "2024-02-29",
    title: "Leap day",
    images: [{ src: "/leap.jpg", alt: "Leap day" }],
  });
  const entry = parseExperienceFile(source, "life", "/virtual/life/leap.json");
  assert.deepEqual(entry, {
    id: "life-2024-02-29",
    moduleId: "life",
    date: "2024-02-29",
    title: "Leap day",
    images: [{ src: "/leap.jpg", alt: "Leap day" }],
  });
  assert.deepEqual(experienceFileData(entry), {
    id: "life-2024-02-29",
    date: "2024-02-29",
    title: "Leap day",
    images: [{ src: "/leap.jpg", alt: "Leap day" }],
  });

  const serialized = serializeExperienceFile(entry);
  assert.ok(serialized.endsWith("\n"));
  assert.equal(serialized.endsWith("\n\n"), false);
  assert.deepEqual(JSON.parse(serialized), experienceFileData(entry));
  assert.equal(Object.hasOwn(JSON.parse(serialized), "moduleId"), false);
});

test("malformed JSON and invalid event bodies fail with their source path", (t) => {
  const cases = [
    ["2024-01-01.json", "{", /Invalid JSON/],
    ["2024-01-01.json", "[]", /must be an object/],
    ["2024-01-01.json", { id: "school-2024-01-01", moduleId: "life", date: "2024-01-01", text: "No" }, /unsupported field "moduleId"/],
    ["2024-01-01.json", { id: "school-2024-01-01", date: "2024-01-01", text: "No", extra: true }, /unsupported field "extra"/],
    ["2024-01-01.json", { date: "2024-01-01", text: "No id" }, /id must be a nonempty string/],
    ["2024-02-30.json", { id: "school-2024-02-30", date: "2024-02-30", text: "No" }, /Invalid experience date/],
    ["2024-01-01.json", { id: "school-2024-01-01", date: "2024-01-01" }, /must contain/],
  ];

  for (const [fileName, data, pattern] of cases) {
    const root = temporaryRoot(t);
    const filePath = writeJson(root, "school", fileName, data);
    assert.throws(() => loadExperienceFiles(root), (error) => {
      assert.match(error.message, pattern);
      assert.match(error.message, new RegExp(filePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return true;
    });
  }
});

test("entry IDs are derived exactly from their module and filename", (t) => {
  const root = temporaryRoot(t);
  const filePath = writeJson(root, "school", "2024-01-01-01.json", {
    id: "arbitrary-id", date: "2024-01-01", text: "School",
  });

  assert.throws(() => loadExperienceStore(root), (error) => {
    assert.match(error.message, /entry id must be "school-2024-01-01-01"/);
    assert.ok(error.message.includes(filePath));
    return true;
  });
  assert.equal(
    experienceIdFromFileName("school", "2024-01-01-01.json"),
    "school-2024-01-01-01",
  );
});

test("only safe direct JSON filenames are accepted", (t) => {
  for (const valid of [
    "2024-01-01.json", "2024-01-01-01.json", "2024-01-01-09.json", "2024-01-01-99.json",
  ]) {
    assert.equal(validateExperienceFileName(valid), valid);
    assert.equal(experienceDateFromFileName(valid), "2024-01-01");
  }
  for (const invalid of [
    "event", "event.JSON", ".hidden.json", "event.json", "2024-01-01-.json",
    "2024-01-01-00.json", "2024-01-01-1.json", "2024-01-01-100.json",
    "2024-01-01-event.json", "2024-01-01-event.name.json", "2024-01-01-经历.json",
    "../2024-01-01.json", "nested/2024-01-01.json",
  ]) {
    assert.throws(() => validateExperienceFileName(invalid), /Invalid experience filename/);
  }
  assert.throws(
    () => experienceFilePath("/tmp/experiences", "unknown", "2024-01-01.json"),
    /Unknown experience module/,
  );

  const root = temporaryRoot(t);
  const unsafePath = writeJson(root, "school", "2024-01-01-name.json", {
    id: "school-2024-01-01-name", date: "2024-01-01", text: "No",
  });
  assert.throws(() => loadExperienceFiles(root), (error) => {
    assert.match(error.message, /Invalid experience filename/);
    assert.ok(error.message.includes(unsafePath.split("/").at(-1)));
    return true;
  });
});

test("the filename date must match the event date", (t) => {
  const root = temporaryRoot(t);
  const filePath = writeJson(root, "school", "2024-01-02.json", {
    id: "school-2024-01-02", date: "2024-01-01", text: "Wrong filename date",
  });
  assert.throws(() => loadExperienceFiles(root), (error) => {
    assert.match(error.message, /filename date "2024-01-02" must match entry date "2024-01-01"/);
    assert.ok(error.message.includes(filePath));
    return true;
  });
});

test("nested and symbolic-link JSON files are rejected", async (t) => {
  await t.test("nested JSON", (nestedTest) => {
    const root = temporaryRoot(nestedTest);
    const nestedPath = writeJson(root, "school/nested", "2024-01-01.json", {
      id: "school-2024-01-01", date: "2024-01-01", text: "Nested",
    });
    assert.throws(() => loadExperienceFiles(root), (error) => {
      assert.match(error.message, /direct child/);
      assert.ok(error.message.includes(nestedPath));
      return true;
    });
  });

  await t.test("symbolic-link JSON", (symlinkTest) => {
    const root = temporaryRoot(symlinkTest);
    const target = writeJson(root, "outside", "2024-01-01.json", {
      id: "school-2024-01-01", date: "2024-01-01", text: "Linked",
    });
    const moduleDir = join(root, "school");
    mkdirSync(moduleDir, { recursive: true });
    const linkPath = join(moduleDir, "2024-01-01.json");
    symlinkSync(target, linkPath);
    assert.throws(() => loadExperienceFiles(root), (error) => {
      assert.match(error.message, /must not be a symbolic link/);
      assert.ok(error.message.includes(linkPath));
      return true;
    });
  });

  await t.test("symbolic-link module directory", (symlinkTest) => {
    const root = temporaryRoot(symlinkTest);
    const targetDir = join(root, "actual-school");
    mkdirSync(targetDir);
    symlinkSync(targetDir, join(root, "school"));
    assert.throws(() => loadExperienceFiles(root), /module directory .* must not be a symbolic link/);
  });
});
