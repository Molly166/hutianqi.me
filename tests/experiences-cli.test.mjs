import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cli = fileURLToPath(new URL("../scripts/experiences.mjs", import.meta.url));
const emptyStore = {
  version: 1,
  modules: [{ id: "school", label: "学校" }, { id: "life", label: "生活" }],
  entries: [],
};

async function fixture(t, entries = []) {
  const directory = await mkdtemp(join(tmpdir(), "hutianqi-experiences-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const store = join(directory, "experiences.json");
  await writeFile(store, JSON.stringify({ ...emptyStore, entries }));
  return {
    directory,
    store,
    run(...args) {
      return spawnSync(process.execPath, ["--experimental-strip-types", cli, ...args, "--store", store], { encoding: "utf8" });
    },
    async input(name, value) {
      const path = join(directory, name);
      await writeFile(path, JSON.stringify(value));
      return path;
    },
    async read() { return JSON.parse(await readFile(store, "utf8")); },
  };
}

function successful(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("add, list, update, and remove preserve an independent note ID", async (t) => {
  const f = await fixture(t);
  const input = await f.input("note.json", {
    date: "2023-09-15", text: "临时测试内容", images: [{ src: "/images/test.jpg", alt: "测试图片" }],
  });
  const added = successful(f.run("add", "--module", "school", "--input", input));
  assert.match(added.entry.id, /^[a-f\d-]{36}$/);
  assert.equal(added.entry.moduleId, "school");
  assert.equal(added.dryRun, false);
  assert.equal(added.totalEntries, 1);
  assert.equal(successful(f.run("list", "--module", "school"))[0].id, added.entry.id);

  const patch = await f.input("patch.json", { text: "已修改的临时内容", date: "2024-02-29" });
  const updated = successful(f.run("update", "--module", "school", "--id", added.entry.id, "--input", patch));
  assert.equal(updated.entry.id, added.entry.id);
  assert.equal(updated.entry.text, "已修改的临时内容");
  assert.equal(updated.entry.date, "2024-02-29");
  assert.deepEqual(updated.entry.images, added.entry.images);

  const removed = successful(f.run("remove", "--module", "school", "--id", added.entry.id));
  assert.equal(removed.entry.id, added.entry.id);
  assert.deepEqual((await f.read()).entries, []);
  assert.deepEqual((await readdir(f.directory)).filter((name) => name.endsWith(".tmp")), []);
});

test("list sorts by date with stable ties and filters by module", async (t) => {
  const f = await fixture(t, [
    { id: "later", moduleId: "school", date: "2024-01-01", text: "later" },
    { id: "first", moduleId: "school", date: "2023-09-01", text: "first" },
    { id: "same-date", moduleId: "school", date: "2023-09-01", text: "same" },
    { id: "life", moduleId: "life", date: "2023-01-01", text: "life" },
  ]);
  assert.deepEqual(successful(f.run("list", "--module", "school")).map(({ id }) => id), ["first", "same-date", "later"]);
  assert.deepEqual(successful(f.run("list")).map(({ id }) => id), ["life", "first", "same-date", "later"]);
});

test("dry-run validates every mutation without changing the store", async (t) => {
  const f = await fixture(t, [{ id: "existing", moduleId: "school", date: "2023-09-01", text: "keep" }]);
  const original = await readFile(f.store, "utf8");
  const input = await f.input("note.json", { id: "new", date: "2023-09-02", title: "test" });
  const patch = await f.input("patch.json", { text: "changed" });
  for (const args of [
    ["add", "--module", "school", "--input", input],
    ["update", "--module", "school", "--id", "existing", "--input", patch],
    ["remove", "--module", "school", "--id", "existing"],
  ]) {
    assert.equal(successful(f.run(...args, "--dry-run")).dryRun, true);
    assert.equal(await readFile(f.store, "utf8"), original);
  }
});

test("wrong module, unknown module, and missing IDs never mutate records", async (t) => {
  const f = await fixture(t, [{ id: "school-note", moduleId: "school", date: "2023-09-01", text: "keep" }]);
  const original = await readFile(f.store, "utf8");
  const patch = await f.input("patch.json", { text: "changed" });
  const mismatch = await f.input("mismatch.json", { date: "2023-09-02", moduleId: "life", text: "wrong" });
  const move = await f.input("move.json", { moduleId: "life" });
  for (const [args, message] of [
    [["remove", "--module", "life", "--id", "school-note"], /belongs to module school/],
    [["update", "--module", "life", "--id", "school-note", "--input", patch], /belongs to module school/],
    [["remove", "--module", "school", "--id", "missing"], /was not found/],
    [["list", "--module", "unknown"], /Unknown experience module/],
    [["add", "--module", "school", "--input", mismatch], /moduleId must match/],
    [["update", "--module", "school", "--id", "school-note", "--input", move], /moduleId must match/],
  ]) {
    const result = f.run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.equal(await readFile(f.store, "utf8"), original);
  }
});

test("invalid dates, duplicates, empty notes, unknown fields, and ID updates fail safely", async (t) => {
  const f = await fixture(t, [{ id: "existing", moduleId: "school", date: "2023-09-01", text: "keep" }]);
  const original = await readFile(f.store, "utf8");
  for (const [index, value] of [
    { date: "2023-02-29", text: "invalid date" },
    { id: "existing", date: "2023-09-02", text: "duplicate" },
    { date: "2023-09-02", text: "   " },
    { date: "2023-09-02", text: "unknown", unknown: true },
    [],
  ].entries()) {
    const input = await f.input(`invalid-${index}.json`, value);
    const result = f.run("add", "--module", "school", "--input", input);
    assert.equal(result.status, 1, result.stdout);
    assert.equal(await readFile(f.store, "utf8"), original);
  }
  const patch = await f.input("id-patch.json", { id: "replacement" });
  const result = f.run("update", "--module", "school", "--id", "existing", "--input", patch);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /cannot change its id/);
  assert.equal(await readFile(f.store, "utf8"), original);
});

test("malformed JSON and unsupported or incomplete options fail clearly", async (t) => {
  const f = await fixture(t);
  const malformed = join(f.directory, "malformed.json");
  await writeFile(malformed, "{broken");
  for (const [args, message] of [
    [["add", "--module", "school", "--input", malformed], /Invalid JSON/],
    [["remove", "--module", "school"], /Missing required option --id/],
    [["list", "--unknown", "value"], /Unsupported option/],
    [["list", "--module", "school", "--module", "life"], /Duplicate option/],
    [["add", "--module", "school", "--input"], /Missing value/],
    [["delete", "--module", "school"], /Unknown command/],
  ]) {
    const result = f.run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.deepEqual((await f.read()).entries, []);
  }
});

test("removing a note never removes its image files", async (t) => {
  const f = await fixture(t, [{
    id: "photo-note", moduleId: "school", date: "2023-09-01",
    images: [{ src: "/images/precious-photo.jpg", alt: "keep this asset" }],
  }]);
  const imagePath = join(f.directory, "precious-photo.jpg");
  await writeFile(imagePath, "test image fixture");
  successful(f.run("remove", "--module", "school", "--id", "photo-note"));
  assert.equal(await readFile(imagePath, "utf8"), "test image fixture");
});
