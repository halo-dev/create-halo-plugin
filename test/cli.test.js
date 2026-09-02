import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyProjectChange, planProjectChange } from "../src/project.js";

const cliPath = path.resolve(import.meta.dirname, "../index.js");
const projectVariables = {
  projectName: "demo",
  className: "Demo",
  packageName: "run.halo.plugin.demo",
  group: "run.halo.plugin",
  author: "halo",
  haloVersion: "2.26.0",
  haloSeries: "2.26",
  includeUI: false,
  uiTool: null,
};

test("CLI routes an incomplete add command without entering creation", () => {
  const result = spawnSync(process.execPath, [cliPath, "add"], {
    encoding: "utf8",
  });
  const output = `${result.stdout}${result.stderr}`;

  assert.equal(result.status, 1);
  assert.match(output, /Command failed: Usage: create-halo-plugin add/);
  assert.doesNotMatch(output, /Creation failed|Plugin name:/);
});

test("CLI adds a Vite UI to the current plugin", async (t) => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "create-halo-plugin-cli-"),
  );
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );

  const result = spawnSync(
    process.execPath,
    [cliPath, "add", "ui", "--tool", "vite"],
    { cwd: projectPath, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  await access(path.join(projectPath, "ui/vite.config.ts"));
  assert.match(result.stdout, /UI added successfully/);
});

test("CLI adds a Java library module", async (t) => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "create-halo-plugin-cli-"),
  );
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );

  const result = spawnSync(
    process.execPath,
    [cliPath, "add", "module", "api"],
    { cwd: projectPath, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  await access(path.join(projectPath, "api/build.gradle"));
  assert.match(result.stdout, /Module api added successfully/);
});

test("CLI creates a plugin whose name contains a dot", async (t) => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "create-halo-plugin-cli-"),
  );
  const projectPath = path.join(tempDir, "plugin-blog-comment");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      projectPath,
      "--name",
      "blog.comment",
      "--domain",
      "run.halo.plugin",
      "--author",
      "halo",
      "--includeUI=false",
    ],
    { cwd: tempDir, encoding: "utf8" },
  );

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(
    await readFile(
      path.join(
        projectPath,
        "src/main/java/run/halo/plugin/blogcomment/BlogCommentPlugin.java",
      ),
      "utf8",
    ),
    /class BlogCommentPlugin/,
  );
});
