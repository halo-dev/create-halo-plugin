import assert from "node:assert/strict";
import {
  access,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyProjectChange, planProjectChange } from "../src/project.js";

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

test("plans and creates a backend-only plugin", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  const plan = planProjectChange(projectPath, {
    type: "create",
    variables: projectVariables,
  });

  assert.deepEqual(plan.conflicts, []);
  assert.ok(plan.creates.some(({ path: file }) => file === "build.gradle"));

  await applyProjectChange(plan);

  const settings = await readFile(
    path.join(projectPath, "settings.gradle"),
    "utf8",
  );
  assert.match(settings, /rootProject\.name = 'plugin-demo'/);
  assert.doesNotMatch(settings, /create-halo-plugin:/);
  assert.doesNotMatch(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /create-halo-plugin:/,
  );
  assert.match(
    await readFile(
      path.join(
        projectPath,
        "src/main/java/run/halo/plugin/demo/DemoPlugin.java",
      ),
      "utf8",
    ),
    /package run\.halo\.plugin\.demo;/,
  );
  await assert.rejects(access(path.join(projectPath, "ui")));
  assert.notEqual(
    (await stat(path.join(projectPath, "gradlew"))).mode & 0o111,
    0,
  );
});

test("adds a Vite UI to an existing backend-only plugin", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-ui",
    uiTool: "vite",
  });

  assert.deepEqual(plan.conflicts, []);
  assert.ok(
    plan.creates.some(({ path: file }) => file === "ui/vite.config.ts"),
  );
  assert.ok(
    !plan.creates.some(({ path: file }) => file === "ui/rsbuild.config.ts"),
  );

  await applyProjectChange(plan);

  assert.match(
    await readFile(path.join(projectPath, "settings.gradle"), "utf8"),
    /include 'ui'/,
  );
  assert.match(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /tasks\.register\('processUiResources', Copy\)/,
  );
  const packageJson = await readFile(
    path.join(projectPath, "ui/package.json"),
    "utf8",
  );
  assert.match(packageJson, /"vite": "\^8\.2\.0"/);
  assert.match(packageJson, /"@halo-dev\/api-client": "\^2\.26\.0"/);
  assert.match(packageJson, /"node": ">=22\.12\.0"/);
  assert.doesNotMatch(packageJson, /"@rsbuild\/core"/);
});

test("uses the configured Halo version across a new project", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: {
        ...projectVariables,
        haloVersion: "9.8.7",
        haloSeries: "9.8",
        includeUI: true,
        uiTool: "vite",
      },
    }),
  );

  assert.match(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /plugin:9\.8\.7[\s\S]*version = '9\.8'/,
  );
  assert.match(
    await readFile(
      path.join(projectPath, "src/main/resources/plugin.yaml"),
      "utf8",
    ),
    /requires: ">=9\.8\.7"/,
  );
  assert.match(
    await readFile(path.join(projectPath, "ui/package.json"), "utf8"),
    /"@halo-dev\/api-client": "\^9\.8\.7"/,
  );
});

test("inherits the current Halo version when adding UI", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    (await readFile(buildPath, "utf8")).replace(
      "platform('run.halo.tools.platform:plugin:2.26.0')",
      "platform 'run.halo.tools.platform:plugin:2.27.3'",
    ),
  );

  await applyProjectChange(
    planProjectChange(projectPath, { type: "add-ui", uiTool: "vite" }),
  );

  assert.match(
    await readFile(path.join(projectPath, "ui/package.json"), "utf8"),
    /"@halo-dev\/api-client": "\^2\.27\.3"/,
  );
});

test("ignores Halo coordinates inside Gradle strings", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    `def example = "run.halo.tools.platform:plugin:9.9.9"\n${await readFile(buildPath, "utf8")}`,
  );

  const plan = planProjectChange(projectPath, {
    type: "add-ui",
    uiTool: "vite",
  });
  const packageJson = plan.creates
    .find(({ path: file }) => file === "ui/package.json")
    .content.toString();

  assert.match(packageJson, /"@halo-dev\/api-client": "\^2\.26\.0"/);
  assert.doesNotMatch(packageJson, /\^9\.9\.9/);
});

test("rejects unresolved Halo versions for incremental changes", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    (await readFile(buildPath, "utf8")).replace(
      "plugin:2.26.0",
      "plugin:$" + "{haloVersion}",
    ),
  );

  for (const intent of [
    { type: "add-ui", uiTool: "vite" },
    { type: "add-module", name: "api" },
  ]) {
    const plan = planProjectChange(projectPath, intent);
    assert.match(plan.conflicts.join("\n"), /Halo version/);
  }
});

test("adding the same UI twice is a no-op", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: { ...projectVariables, includeUI: true, uiTool: "vite" },
    }),
  );
  const settingsPath = path.join(projectPath, "settings.gradle");
  await writeFile(
    settingsPath,
    (await readFile(settingsPath, "utf8")).replace(
      "include 'ui'",
      "include 'api', 'ui'",
    ),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-ui",
    uiTool: "vite",
  });

  assert.deepEqual(plan.conflicts, []);
  assert.deepEqual(plan.creates, []);
  assert.deepEqual(plan.patches, []);
  assert.deepEqual(plan.skips, ["UI is already configured with vite"]);
});

test("adds UI without relying on generator comments", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );

  for (const file of ["settings.gradle", "build.gradle"]) {
    const filePath = path.join(projectPath, file);
    const content = await readFile(filePath, "utf8");
    await writeFile(
      filePath,
      content.replace(/^\s*\/\/ create-halo-plugin:.*(?:\n|$)/gm, ""),
    );
  }
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    (await readFile(buildPath, "utf8")).replace(
      'id "run.halo.plugin.devtools"',
      "id 'run.halo.plugin.devtools'",
    ),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-ui",
    uiTool: "rsbuild",
  });

  assert.deepEqual(plan.conflicts, []);
  await applyProjectChange(plan);
  assert.match(
    await readFile(path.join(projectPath, "settings.gradle"), "utf8"),
    /include 'ui'/,
  );
  assert.match(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /processUiResources/,
  );
  assert.doesNotMatch(
    await readFile(path.join(projectPath, "settings.gradle"), "utf8"),
    /create-halo-plugin:/,
  );
});

test("adds a publishable Java library module with a starter structure", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });

  assert.deepEqual(plan.conflicts, []);
  assert.ok(plan.creates.some(({ path: file }) => file === "api/build.gradle"));
  await applyProjectChange(plan);

  assert.match(
    await readFile(path.join(projectPath, "settings.gradle"), "utf8"),
    /include 'api'/,
  );
  assert.match(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /implementation project\(':api'\)/,
  );
  assert.match(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /dependsOn\(':api:jar'\)/,
  );
  const moduleBuild = await readFile(
    path.join(projectPath, "api/build.gradle"),
    "utf8",
  );
  assert.match(moduleBuild, /id 'java-library'/);
  assert.match(moduleBuild, /id 'com\.vanniktech\.maven\.publish'/);
  assert.match(moduleBuild, /group = 'run\.halo\.plugin\.demo'/);
  assert.match(moduleBuild, /plugin:2\.26\.0/);
  assert.match(moduleBuild, /JavaLanguageVersion\.of\(21\)/);
  assert.match(
    moduleBuild,
    /coordinates\('run\.halo\.plugin\.demo', 'api', project\.version\.toString\(\)\)/,
  );
  assert.match(moduleBuild, /publishToMavenCentral\(\)/);
  assert.match(moduleBuild, /signAllPublications\(\)/);
  assert.match(moduleBuild, /url = 'https:\/\/github\.com\/halo\/demo'/);
  assert.match(
    await readFile(
      path.join(
        projectPath,
        "api/src/main/java/run/halo/plugin/demo/api/package-info.java",
      ),
      "utf8",
    ),
    /package run\.halo\.plugin\.demo\.api;/,
  );
  await access(path.join(projectPath, "api/src/test/java/.gitkeep"));
  await access(path.join(projectPath, "api/README.md"));
  const publishWorkflow = await readFile(
    path.join(projectPath, ".github/workflows/publish.yml"),
    "utf8",
  );
  assert.match(publishWorkflow, /publishAndReleaseToMavenCentral/);
  assert.match(publishWorkflow, /publishToMavenCentral/);
  assert.ok(publishWorkflow.includes("id: snapshot-version"));
  assert.ok(
    publishWorkflow.includes(
      "publishToMavenCentral -Pversion=$" +
        "{{ steps.snapshot-version.outputs.VERSION }}",
    ),
  );
});

test("ignores module metadata inside Gradle strings", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    `def example = '''\ngroup 'fake.group'\nJavaLanguageVersion.of(99)\n'''\n${await readFile(buildPath, "utf8")}`,
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });
  const moduleBuild = plan.creates
    .find(({ path: file }) => file === "api/build.gradle")
    .content.toString();

  assert.deepEqual(plan.conflicts, []);
  assert.match(moduleBuild, /group = 'run\.halo\.plugin\.demo'/);
  assert.match(moduleBuild, /JavaLanguageVersion\.of\(21\)/);
});

test("rejects Java keywords as module names", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );

  for (const name of ["class", "interface", "null"]) {
    const plan = planProjectChange(projectPath, {
      type: "add-module",
      name,
    });
    assert.match(plan.conflicts.join("\n"), /Invalid module name/);
  }
});

test("does not mistake comments or includeBuild for module wiring", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const settingsPath = path.join(projectPath, "settings.gradle");
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    settingsPath,
    `${await readFile(settingsPath, "utf8")}\nincludeBuild('api')\n/*\n  include 'api'\n*/\n`,
  );
  await writeFile(
    buildPath,
    `${await readFile(buildPath, "utf8")}\n// implementation project(':api')\n// dependsOn(':api:jar')\n`,
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });

  assert.deepEqual(plan.conflicts, []);
  await applyProjectChange(plan);
  assert.match(await readFile(settingsPath, "utf8"), /^include 'api'$/m);
  const build = await readFile(buildPath, "utf8");
  assert.match(build, /^\s{4}implementation project\(':api'\)$/m);
  assert.match(build, /^\s{4}dependsOn\(':api:jar'\)$/m);
});

test("does not mistake slashy strings for module wiring", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    `${await readFile(buildPath, "utf8")}\ndef dependencyExample = /project(':api')/\ndef taskExample = /dependsOn(':api:jar')/\n`,
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });
  const build = plan.patches.find(
    ({ path: file }) => file === "build.gradle",
  ).after;

  assert.deepEqual(plan.conflicts, []);
  assert.match(build, /^\s{4}implementation project\(':api'\)$/m);
  assert.match(build, /^\s{4}dependsOn\(':api:jar'\)$/m);
});

test("rejects a publish workflow scoped to another module", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  await writeFile(
    path.join(projectPath, ".github/workflows/publish.yml"),
    [
      "name: Publish API",
      "run: ./gradlew :api:publishAndReleaseToMavenCentral",
      "run: ./gradlew :api:publishToMavenCentral",
      "# run: ./gradlew publishAndReleaseToMavenCentral",
      "# run: ./gradlew publishToMavenCentral",
      "",
    ].join("\n"),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "client",
  });

  assert.match(plan.conflicts.join("\n"), /does not publish module client/);
});

test("adding the same Java module twice is a no-op", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "add-module",
      name: "api",
    }),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });

  assert.deepEqual(plan.conflicts, []);
  assert.deepEqual(plan.creates, []);
  assert.deepEqual(plan.patches, []);
  assert.deepEqual(plan.skips, ["Module api is already configured"]);
});

test("does not mistake a string for the java-library plugin", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "add-module",
      name: "api",
    }),
  );
  await writeFile(
    path.join(projectPath, "api/build.gradle"),
    `def example = "id 'java-library'"\n`,
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });

  assert.deepEqual(plan.skips, []);
  assert.match(plan.conflicts.join("\n"), /Directory "api" already exists/);
});

test("preserves an unrelated publish workflow", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const workflowPath = path.join(projectPath, ".github/workflows/publish.yml");
  await writeFile(workflowPath, "name: Custom publish\n");

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });

  assert.match(plan.conflicts.join("\n"), /does not publish module api/);
  await assert.rejects(applyProjectChange(plan), /does not publish module api/);
  assert.equal(await readFile(workflowPath, "utf8"), "name: Custom publish\n");
  await assert.rejects(access(path.join(projectPath, "api")));
});

test("keeps existing modules when adding UI", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "add-module",
      name: "api",
    }),
  );

  await applyProjectChange(
    planProjectChange(projectPath, { type: "add-ui", uiTool: "vite" }),
  );

  const settings = await readFile(
    path.join(projectPath, "settings.gradle"),
    "utf8",
  );
  assert.match(settings, /include 'api'/);
  assert.match(settings, /include 'ui'/);
});

test("adds a Java module without relying on generator comments", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  for (const file of ["settings.gradle", "build.gradle"]) {
    const filePath = path.join(projectPath, file);
    await writeFile(
      filePath,
      (await readFile(filePath, "utf8")).replace(
        /^\s*\/\/ create-halo-plugin:.*(?:\n|$)/gm,
        "",
      ),
    );
  }
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    (await readFile(buildPath, "utf8")).replace(
      'id "run.halo.plugin.devtools"',
      "id 'run.halo.plugin.devtools'",
    ),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });

  assert.deepEqual(plan.conflicts, []);
  await applyProjectChange(plan);
  assert.match(
    await readFile(path.join(projectPath, "settings.gradle"), "utf8"),
    /include 'api'/,
  );
  assert.match(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /implementation project\(':api'\)/,
  );
  assert.doesNotMatch(
    await readFile(path.join(projectPath, "build.gradle"), "utf8"),
    /create-halo-plugin:/,
  );
});

test("rolls back an incremental change when applying it fails", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));

  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const originalSettings = await readFile(
    path.join(projectPath, "settings.gradle"),
    "utf8",
  );
  const plan = planProjectChange(projectPath, {
    type: "add-ui",
    uiTool: "vite",
  });
  await writeFile(path.join(projectPath, "blocked"), "not a directory");
  plan.creates.push({
    path: "blocked/file.txt",
    content: "unreachable",
    mode: 0o644,
  });

  await assert.rejects(applyProjectChange(plan));

  await assert.rejects(access(path.join(projectPath, "ui")));
  assert.equal(
    await readFile(path.join(projectPath, "settings.gradle"), "utf8"),
    originalSettings,
  );
});

test("refuses to apply a stale plan", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );

  const plan = planProjectChange(projectPath, {
    type: "add-module",
    name: "api",
  });
  const settingsPath = path.join(projectPath, "settings.gradle");
  await writeFile(
    settingsPath,
    `${await readFile(settingsPath, "utf8")}\n// changed\n`,
  );

  await assert.rejects(applyProjectChange(plan), /changed after planning/);
  await assert.rejects(access(path.join(projectPath, "api")));
});

test("refuses to replace an existing custom UI Gradle task", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    `${await readFile(
      buildPath,
      "utf8",
    )}\n\ntasks.register('processUiResources') {\n    doLast { println 'custom' }\n}\n`,
  );

  const plan = planProjectChange(projectPath, {
    type: "add-ui",
    uiTool: "vite",
  });

  assert.match(plan.conflicts.join("\n"), /processUiResources/);
  await assert.rejects(applyProjectChange(plan), /processUiResources/);
  await assert.rejects(access(path.join(projectPath, "ui")));
});

test("does not mistake a string for a UI Gradle task", async (t) => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "create-halo-plugin-"));
  const projectPath = path.join(tempDir, "plugin-demo");
  t.after(() => rm(tempDir, { recursive: true, force: true }));
  await applyProjectChange(
    planProjectChange(projectPath, {
      type: "create",
      variables: projectVariables,
    }),
  );
  const buildPath = path.join(projectPath, "build.gradle");
  await writeFile(
    buildPath,
    `def message = "processUiResources"\n${await readFile(buildPath, "utf8")}`,
  );

  const plan = planProjectChange(projectPath, {
    type: "add-ui",
    uiTool: "vite",
  });

  assert.deepEqual(plan.conflicts, []);
  assert.match(
    plan.patches.find(({ path: file }) => file === "build.gradle").after,
    /tasks\.register\('processUiResources', Copy\)/,
  );
});
