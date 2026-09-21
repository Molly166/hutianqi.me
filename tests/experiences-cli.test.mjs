import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const cli = fileURLToPath(new URL("../scripts/experiences.mjs", import.meta.url));
const moduleIds = ["school", "company", "internship", "work", "life", "watch"];

function runCli(root, ...args) {
  return spawnSync(
    process.execPath,
    ["--experimental-strip-types", cli, ...args, "--root", root],
    { encoding: "utf8" },
  );
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function snapshot(root) {
  const files = {};
  for (const moduleId of moduleIds) {
    const moduleDirectory = join(root, moduleId);
    for (const fileName of (await readdir(moduleDirectory)).sort()) {
      files[`${moduleId}/${fileName}`] = await readFile(join(moduleDirectory, fileName), "utf8");
    }
  }
  return files;
}

async function fixture(t, entries = []) {
  const directory = await mkdtemp(join(tmpdir(), "hutianqi-experiences-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const root = join(directory, "experiences");
  await mkdir(root);
  await Promise.all(moduleIds.map((moduleId) => mkdir(join(root, moduleId))));

  const usedNames = new Map();
  for (const source of entries) {
    const { moduleId, fileName: requestedName, ...entry } = source;
    const key = `${moduleId}/${entry.date}`;
    const index = usedNames.get(key) ?? 0;
    usedNames.set(key, index + 1);
    const fileName = requestedName ?? `${entry.date}${index ? `-${String(index).padStart(2, "0")}` : ""}.json`;
    const stem = fileName.slice(0, -".json".length);
    const body = { ...entry, id: entry.id ?? `${moduleId}-${stem}` };
    await writeFile(join(root, moduleId, fileName), `${JSON.stringify(body, null, 2)}\n`);
  }

  return {
    directory,
    root,
    run(...args) {
      return runCli(root, ...args);
    },
    async input(name, value) {
      const path = join(directory, name);
      await writeFile(path, JSON.stringify(value));
      return path;
    },
    path(moduleId, fileName) {
      return join(root, moduleId, fileName);
    },
  };
}

function successful(result) {
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test("add, list, update, and remove operate on one independent event file", async (t) => {
  const f = await fixture(t, [{
    moduleId: "life", date: "2022-01-01", text: "do not touch",
  }]);
  const unrelatedPath = f.path("life", "2022-01-01.json");
  const unrelatedSource = await readFile(unrelatedPath, "utf8");
  const input = await f.input("note.json", {
    date: "2023-09-15", text: "临时测试内容", images: [{ src: "/images/test.jpg", alt: "测试图片" }],
  });

  const added = successful(f.run("add", "--module", "school", "--input", input));
  assert.equal(added.entry.id, "school-2023-09-15");
  assert.equal(added.entry.moduleId, "school");
  assert.equal(added.file, f.path("school", "2023-09-15.json"));
  assert.equal(added.totalEntries, 2);
  const saved = JSON.parse(await readFile(added.file, "utf8"));
  assert.equal(saved.id, added.entry.id);
  assert.equal(Object.hasOwn(saved, "moduleId"), false);
  assert.equal(successful(f.run("list", "--module", "school"))[0].id, added.entry.id);

  const patch = await f.input("patch.json", { text: "已修改的临时内容", date: "2024-02-29" });
  const updated = successful(f.run("update", "--module", "school", "--id", added.entry.id, "--input", patch));
  assert.equal(updated.previousId, added.entry.id);
  assert.equal(updated.entry.id, "school-2024-02-29");
  assert.equal(updated.entry.text, "已修改的临时内容");
  assert.deepEqual(updated.entry.images, added.entry.images);
  assert.equal(updated.file, f.path("school", "2024-02-29.json"));
  assert.equal(await exists(added.file), false);
  assert.equal(await readFile(unrelatedPath, "utf8"), unrelatedSource);

  const removed = successful(f.run("remove", "--module", "school", "--id", updated.entry.id));
  assert.equal(removed.entry.id, updated.entry.id);
  assert.equal(await exists(updated.file), false);
  assert.equal(await readFile(unrelatedPath, "utf8"), unrelatedSource);
  assert.deepEqual((await readdir(f.path("school", "."))).filter((name) => name.endsWith(".tmp")), []);
});

test("same-day files use numeric suffixes and list deterministically by date then filename", async (t) => {
  const f = await fixture(t, [
    { moduleId: "school", date: "2024-01-01", text: "later" },
    { moduleId: "school", date: "2023-09-01", text: "first" },
    { moduleId: "school", date: "2023-09-01", text: "same" },
    { moduleId: "life", date: "2023-01-01", text: "life" },
  ]);
  assert.deepEqual(successful(f.run("list", "--module", "school")).map(({ id }) => id), [
    "school-2023-09-01", "school-2023-09-01-01", "school-2024-01-01",
  ]);
  assert.deepEqual(successful(f.run("list")).map(({ id }) => id), [
    "life-2023-01-01", "school-2023-09-01", "school-2023-09-01-01", "school-2024-01-01",
  ]);

  const input = await f.input("third.json", { date: "2023-09-01", text: "third" });
  const added = successful(f.run("add", "--module", "school", "--input", input));
  assert.equal(basename(added.file), "2023-09-01-02.json");
});

test("dry-run validates every mutation without creating, changing, or removing files", async (t) => {
  const f = await fixture(t, [{ moduleId: "school", date: "2023-09-01", text: "keep" }]);
  const original = await snapshot(f.root);
  const input = await f.input("note.json", { date: "2023-09-02", title: "test" });
  const patch = await f.input("patch.json", { text: "changed", date: "2024-01-01" });
  for (const args of [
    ["add", "--module", "school", "--input", input],
    ["update", "--module", "school", "--id", "school-2023-09-01", "--input", patch],
    ["remove", "--module", "school", "--id", "school-2023-09-01"],
  ]) {
    const result = successful(f.run(...args, "--dry-run"));
    assert.equal(result.dryRun, true);
    assert.deepEqual(await snapshot(f.root), original);
  }
});

test("module scoping, derived IDs, and allowed input fields fail without mutation", async (t) => {
  const f = await fixture(t, [{ moduleId: "school", date: "2023-09-01", text: "keep" }]);
  const original = await snapshot(f.root);
  const patch = await f.input("patch.json", { text: "changed" });
  const moduleInput = await f.input("module-input.json", { date: "2023-09-02", moduleId: "school", text: "wrong" });
  const idPatch = await f.input("id-patch.json", { id: "replacement" });
  const modulePatch = await f.input("module-patch.json", { moduleId: "life" });
  for (const [args, message] of [
    [["remove", "--module", "life", "--id", "school-2023-09-01"], /belongs to module school/],
    [["update", "--module", "life", "--id", "school-2023-09-01", "--input", patch], /belongs to module school/],
    [["remove", "--module", "school", "--id", "missing"], /was not found/],
    [["list", "--module", "unknown"], /Unknown experience module/],
    [["add", "--module", "school", "--input", moduleInput], /unsupported field "moduleId"/],
    [["update", "--module", "school", "--id", "school-2023-09-01", "--input", idPatch], /unsupported field "id"/],
    [["update", "--module", "school", "--id", "school-2023-09-01", "--input", modulePatch], /unsupported field "moduleId"/],
  ]) {
    const result = f.run(...args);
    assert.equal(result.status, 1, result.stdout);
    assert.match(result.stderr, message);
    assert.deepEqual(await snapshot(f.root), original);
  }
});

test("invalid entries and a non-derived explicit ID never create a file", async (t) => {
  const f = await fixture(t, [{ moduleId: "life", date: "2023-09-01", text: "keep" }]);
  const original = await snapshot(f.root);
  for (const [index, value] of [
    { date: "2023-02-29", text: "invalid date" },
    { id: "life-2023-09-02", date: "2023-09-02", text: "wrong module prefix" },
    { date: "2023-09-02", text: "   " },
    { date: "2023-09-02", text: "unknown", unknown: true },
    [],
  ].entries()) {
    const input = await f.input(`invalid-${index}.json`, value);
    const result = f.run("add", "--module", "school", "--input", input);
    assert.equal(result.status, 1, result.stdout);
    assert.deepEqual(await snapshot(f.root), original);
  }
});

test("a filename collision never overwrites an existing event", async (t) => {
  const f = await fixture(t, [{ moduleId: "school", date: "2023-09-02", text: "keep" }]);
  const existingPath = f.path("school", "2023-09-02.json");
  const originalSource = await readFile(existingPath, "utf8");
  const input = await f.input("second.json", {
    id: "school-2023-09-02-01", date: "2023-09-02", text: "new",
  });
  const added = successful(f.run("add", "--module", "school", "--input", input));
  assert.equal(basename(added.file), "2023-09-02-01.json");
  assert.equal(await readFile(existingPath, "utf8"), originalSource);
});

test("a date update changes the derived ID and selects the lowest free target suffix", async (t) => {
  const f = await fixture(t, [
    { moduleId: "school", date: "2023-09-02", text: "move me" },
    { moduleId: "school", date: "2024-01-01", text: "occupied" },
  ]);
  const occupiedPath = f.path("school", "2024-01-01.json");
  const occupiedSource = await readFile(occupiedPath, "utf8");
  const patch = await f.input("new-date.json", { date: "2024-01-01" });
  const updated = successful(f.run(
    "update", "--module", "school", "--id", "school-2023-09-02", "--input", patch,
  ));

  assert.equal(updated.previousId, "school-2023-09-02");
  assert.equal(updated.entry.id, "school-2024-01-01-01");
  assert.equal(updated.file, f.path("school", "2024-01-01-01.json"));
  assert.equal(await exists(f.path("school", "2023-09-02.json")), false);
  assert.equal(await readFile(occupiedPath, "utf8"), occupiedSource);
});

test("custom IDs are rejected and never interpreted as filesystem paths", async (t) => {
  const f = await fixture(t);
  const input = await f.input("unsafe-id.json", { id: "../outside", date: "2023-09-02", text: "safe path" });
  const result = f.run("add", "--module", "school", "--input", input);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /id must be "school-2023-09-02"/);
  assert.equal(await exists(join(f.directory, "outside.json")), false);
  assert.deepEqual(await snapshot(f.root), {});
});

test("malformed stored JSON and symbolic links fail clearly", async (t) => {
  const malformedFixture = await fixture(t);
  const malformed = malformedFixture.path("school", "2023-09-01.json");
  await writeFile(malformed, "{broken");
  const malformedResult = malformedFixture.run("list", "--module", "school");
  assert.equal(malformedResult.status, 1);
  assert.match(malformedResult.stderr, /Invalid JSON/);
  assert.match(malformedResult.stderr, /2023-09-01\.json/);

  const symlinkFixture = await fixture(t);
  const target = join(symlinkFixture.directory, "event.json");
  await writeFile(target, JSON.stringify({ id: "school-2023-09-01", date: "2023-09-01", text: "linked" }));
  await symlink(target, symlinkFixture.path("school", "2023-09-01.json"));
  const symlinkResult = symlinkFixture.run("list", "--module", "school");
  assert.equal(symlinkResult.status, 1);
  assert.match(symlinkResult.stderr, /symbolic link|regular file/i);

  const rootFixture = await fixture(t);
  const linkedRoot = join(rootFixture.directory, "linked-experiences");
  await symlink(rootFixture.root, linkedRoot);
  const rootResult = runCli(linkedRoot, "list");
  assert.equal(rootResult.status, 1);
  assert.match(rootResult.stderr, /root must be a regular directory|symbolic link/i);
});

test("malformed input and unsupported or incomplete options fail clearly", async (t) => {
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
    [["list", "--store", join(f.directory, "old.json")], /Unsupported option/],
  ]) {
    const result = f.run(...args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
    assert.deepEqual(await snapshot(f.root), {});
  }
});

test("updates and removals never delete image assets", async (t) => {
  const f = await fixture(t, [{
    moduleId: "school", date: "2023-09-01", title: "Photo",
    images: [{ src: "/images/experiences/school/2023-09-01/precious.jpg", alt: "keep this asset" }],
  }]);
  const imagePath = join(f.directory, "public", "images", "experiences", "school", "2023-09-01", "precious.jpg");
  await mkdir(dirname(imagePath), { recursive: true });
  await writeFile(imagePath, "test image fixture");

  const patch = await f.input("remove-reference.json", { images: [] });
  const updated = successful(f.run("update", "--module", "school", "--id", "school-2023-09-01", "--input", patch));
  assert.deepEqual(updated.entry.images, []);
  assert.equal(await readFile(imagePath, "utf8"), "test image fixture");

  successful(f.run("remove", "--module", "school", "--id", "school-2023-09-01"));
  assert.equal(await readFile(imagePath, "utf8"), "test image fixture");
});
