import path from "node:path";
import fs from "fs-extra";
import { MAVEN_PUBLISH_PLUGIN_VERSION } from "./constants.js";
import { renderInternalFiles, renderProjectFiles } from "./template-engine.js";

/**
 * Plan a project change without writing files.
 * @param {string} projectPath Project root
 * @param {{type: "create", variables: Object}} intent Requested change
 * @returns {Object} Change plan
 */
export function planProjectChange(projectPath, intent) {
  if (intent.type === "add-ui") {
    return planAddUi(projectPath, intent.uiTool);
  }
  if (intent.type === "add-module") {
    return planAddModule(projectPath, intent.name);
  }

  if (intent.type !== "create") {
    throw new Error(`Unsupported project change: ${intent.type}`);
  }

  const conflicts = [];
  if (fs.existsSync(projectPath)) {
    const files = fs.readdirSync(projectPath);
    if (files.length > 0 && !(files.length === 1 && files[0] === ".git")) {
      conflicts.push(`Directory "${projectPath}" is not empty`);
    }
  }

  const creates = renderProjectFiles(intent.variables);
  if (intent.variables.includeUI) {
    const settings = creates.find(
      ({ path: file }) => file === "settings.gradle",
    );
    const build = creates.find(({ path: file }) => file === "build.gradle");
    settings.content = addProjectInclude(settings.content, "ui");
    build.content = addUiBuild(build.content, renderUiBuild(intent.variables));
  }

  return {
    projectPath,
    creates,
    patches: [],
    skips: [],
    conflicts,
  };
}

function planAddModule(projectPath, name) {
  const plan = emptyPlan(projectPath);
  if (!/^[a-z][a-z0-9-]*$/.test(name) || name === "ui") {
    plan.conflicts.push(`Invalid module name: ${name}`);
    return plan;
  }

  const settingsPath = path.join(projectPath, "settings.gradle");
  const buildPath = path.join(projectPath, "build.gradle");
  const manifestPath = path.join(projectPath, "src/main/resources/plugin.yaml");
  if (
    !fs.existsSync(settingsPath) ||
    !fs.existsSync(buildPath) ||
    !fs.existsSync(manifestPath)
  ) {
    plan.conflicts.push(
      `Directory "${projectPath}" is not a Halo plugin project`,
    );
    return plan;
  }
  const settings = fs.readFileSync(settingsPath, "utf8");
  const build = fs.readFileSync(buildPath, "utf8");
  const manifest = fs.readFileSync(manifestPath, "utf8");
  if (fs.existsSync(path.join(projectPath, name))) {
    const moduleBuildPath = path.join(projectPath, name, "build.gradle");
    if (
      fs.existsSync(moduleBuildPath) &&
      fs.readFileSync(moduleBuildPath, "utf8").includes("id 'java-library'") &&
      hasProjectInclude(settings, name) &&
      build.includes(`project(':${name}')`)
    ) {
      plan.skips.push(`Module ${name} is already configured`);
    } else {
      plan.conflicts.push(`Directory "${name}" already exists`);
    }
    return plan;
  }

  const group = build.match(/^\s*group\s*(?:=\s*)?['"]([^'"]+)['"]/m)?.[1];
  const haloVersion = build.match(
    /run\.halo\.tools\.platform:plugin:([^'")]+)/,
  )?.[1];
  const javaVersion = build.match(/JavaLanguageVersion\.of\((\d+)\)/)?.[1];
  if (!group || !haloVersion || !javaVersion) {
    plan.conflicts.push(
      "Cannot determine group, Halo version, and Java version from build.gradle",
    );
    return plan;
  }

  const modulePackage = `${group}.${name.replace(/-/g, "")}`;
  if (
    !modulePackage
      .split(".")
      .every((part) => /^[a-z_$][a-z0-9_$]*$/i.test(part))
  ) {
    plan.conflicts.push(`Cannot create a Java package from group "${group}"`);
    return plan;
  }
  const publishing = readPublishingMetadata(manifest, settings, name);
  if (publishing.error) {
    plan.conflicts.push(publishing.error);
    return plan;
  }

  plan.creates.push(
    ...renderInternalFiles("java-library", {
      group,
      haloVersion,
      javaVersion,
      moduleName: name,
      modulePackage,
      mavenPublishPluginVersion: MAVEN_PUBLISH_PLUGIN_VERSION,
      ...publishing,
    }).map((file) => {
      const relativePath =
        file.path === "src/main/java/package-info.java"
          ? path.join(
              "src/main/java",
              modulePackage.replace(/\./g, "/"),
              "package-info.java",
            )
          : file.path;
      return { ...file, path: path.join(name, relativePath) };
    }),
  );
  const publishWorkflowPath = path.join(
    projectPath,
    ".github/workflows/publish.yml",
  );
  if (!fs.existsSync(publishWorkflowPath)) {
    plan.creates.push(
      ...renderInternalFiles("publish-workflow", {}).map((file) => ({
        ...file,
        content: file.content
          .toString()
          .replace("java-version: 21", `java-version: ${javaVersion}`),
      })),
    );
  } else {
    const workflow = fs.readFileSync(publishWorkflowPath, "utf8");
    if (
      workflow.includes("publishAndReleaseToMavenCentral") &&
      workflow.includes("publishToMavenCentral")
    ) {
      plan.skips.push("Publish workflow already exists");
    } else {
      plan.conflicts.push(
        ".github/workflows/publish.yml exists but does not configure Maven Central publishing",
      );
    }
  }

  const nextSettings = addProjectInclude(settings, name);
  const buildWithDependency = addProjectDependency(build, name);
  const nextBuild = buildWithDependency
    ? addModuleJarDependency(buildWithDependency, name)
    : null;
  if (nextSettings === null || nextBuild === null) {
    plan.conflicts.push(
      "Cannot locate the top-level Gradle dependencies block",
    );
    return plan;
  }

  plan.patches.push(
    { path: "settings.gradle", before: settings, after: nextSettings },
    { path: "build.gradle", before: build, after: nextBuild },
  );
  return plan;
}

function readPublishingMetadata(manifest, settings, moduleName) {
  const projectName = settings.match(
    /rootProject\.name\s*=\s*['"]([^'"]+)['"]/,
  )?.[1];
  const displayName = readYamlScalar(manifest, "displayName");
  const description = readYamlScalar(manifest, "description");
  const projectUrl = readYamlScalar(manifest, "repo");
  const authorName = readNestedYamlScalar(manifest, "author", "name");
  const authorUrl = readNestedYamlScalar(manifest, "author", "website");
  const licenseName = readNestedYamlScalar(manifest, "license", "name");
  const licenseUrl = readNestedYamlScalar(manifest, "license", "url");
  const fields = {
    projectName,
    displayName,
    description,
    projectUrl,
    authorName,
    authorUrl,
    licenseName,
    licenseUrl,
  };
  const missing = Object.entries(fields)
    .filter(([, value]) => !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    return {
      error: `Cannot configure Maven publishing; missing project metadata: ${missing.join(
        ", ",
      )}`,
    };
  }

  let repository;
  try {
    repository = new URL(projectUrl);
  } catch {
    return {
      error: `Cannot configure Maven publishing; invalid repo URL: ${projectUrl}`,
    };
  }
  const repositoryPath = repository.pathname.replace(/^\/|\/$/g, "");
  const developerId = repositoryPath.split("/")[0] || authorName;
  const gitUrl = `${repository.origin}/${repositoryPath}`;
  return Object.fromEntries(
    Object.entries({
      projectName,
      pomName: `${displayName} ${moduleName}`,
      pomDescription: `${description} - ${moduleName} Java library`,
      projectUrl: gitUrl,
      licenseName,
      licenseUrl,
      developerId,
      developerName: authorName,
      developerUrl: authorUrl,
      scmUrl: gitUrl,
      scmConnection: `scm:git:${gitUrl}.git`,
      scmDeveloperConnection:
        repository.hostname === "github.com"
          ? `scm:git:ssh://git@github.com/${repositoryPath}.git`
          : `scm:git:${gitUrl}.git`,
    }).map(([key, value]) => [key, escapeGroovyString(value)]),
  );
}

function readYamlScalar(content, key) {
  const match = content.match(new RegExp(`^\\s*${key}:\\s*(.+?)\\s*$`, "m"));
  return match ? unquoteYamlScalar(match[1]) : null;
}

function readNestedYamlScalar(content, parent, key) {
  const lines = content.split("\n");
  const parentIndex = lines.findIndex((line) =>
    new RegExp(`^(\\s*)${parent}:\\s*$`).test(line),
  );
  if (parentIndex === -1) {
    return null;
  }
  const parentIndent = lines[parentIndex].match(/^\s*/)[0].length;
  for (const line of lines.slice(parentIndex + 1)) {
    const indent = line.match(/^\s*/)[0].length;
    if (line.trim() && indent <= parentIndent) {
      break;
    }
    const match = line.match(
      new RegExp(`^\\s*(?:-\\s*)?${key}:\\s*(.+?)\\s*$`),
    );
    if (match) {
      return unquoteYamlScalar(match[1]);
    }
  }
  return null;
}

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function escapeGroovyString(value) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function planAddUi(projectPath, uiTool) {
  const plan = emptyPlan(projectPath);
  if (!["vite", "rsbuild"].includes(uiTool)) {
    plan.conflicts.push(`Unsupported UI tool: ${uiTool}`);
    return plan;
  }

  const settingsPath = path.join(projectPath, "settings.gradle");
  const buildPath = path.join(projectPath, "build.gradle");
  const manifestPath = path.join(projectPath, "src/main/resources/plugin.yaml");
  if (
    !fs.existsSync(settingsPath) ||
    !fs.existsSync(buildPath) ||
    !fs.existsSync(manifestPath)
  ) {
    plan.conflicts.push(
      `Directory "${projectPath}" is not a Halo plugin project`,
    );
    return plan;
  }

  const settings = fs.readFileSync(settingsPath, "utf8");
  const build = fs.readFileSync(buildPath, "utf8");
  if (fs.existsSync(path.join(projectPath, "ui"))) {
    const existingTool = fs.existsSync(
      path.join(projectPath, "ui/vite.config.ts"),
    )
      ? "vite"
      : fs.existsSync(path.join(projectPath, "ui/rsbuild.config.ts"))
        ? "rsbuild"
        : null;
    if (
      existingTool === uiTool &&
      hasProjectInclude(settings, "ui") &&
      build.includes("processUiResources")
    ) {
      plan.skips.push(`UI is already configured with ${uiTool}`);
    } else {
      plan.conflicts.push('Directory "ui" already exists');
    }
    return plan;
  }
  if (build.includes("processUiResources")) {
    plan.conflicts.push(
      "build.gradle already defines processUiResources but the ui directory is missing",
    );
    return plan;
  }

  const group = build.match(/^\s*group\s*(?:=\s*)?['"]([^'"]+)['"]/m)?.[1];
  const haloVersion = build.match(
    /run\.halo\.tools\.platform:plugin:([^'")]+)/,
  )?.[1];
  if (!group || !haloVersion) {
    plan.conflicts.push(
      "Cannot determine the plugin group and Halo version from build.gradle",
    );
    return plan;
  }

  const variables = {
    packageName: group,
    includeUI: true,
    uiTool,
    haloVersion,
  };
  const rendered = renderProjectFiles(variables, (file) =>
    file.replace(/\\/g, "/").startsWith("ui/"),
  );
  plan.creates.push(...rendered);

  const nextSettings = addProjectInclude(settings, "ui");
  const nextBuild = addUiBuild(build, renderUiBuild(variables));

  plan.patches.push(
    { path: "settings.gradle", before: settings, after: nextSettings },
    { path: "build.gradle", before: build, after: nextBuild },
  );
  return plan;
}

function addProjectInclude(settings, name) {
  if (hasProjectInclude(settings, name)) {
    return settings;
  }
  return `${settings.trimEnd()}\ninclude '${name}'\n`;
}

function hasProjectInclude(settings, name) {
  const statements = settings.matchAll(
    /(?:^|\n)\s*include\s*(?:\(([\s\S]*?)\)|([^\n]+))/g,
  );
  for (const statement of statements) {
    const argumentsText = statement[1] ?? statement[2];
    for (const argument of argumentsText.matchAll(/['"]([^'"]+)['"]/g)) {
      if (argument[1].replace(/^:/, "") === name) {
        return true;
      }
    }
  }
  return false;
}

function addProjectDependency(build, name) {
  if (new RegExp(`project\\(\\s*['"]:${name}['"]\\s*\\)`).test(build)) {
    return build;
  }
  const block = findTopLevelBlock(build, "dependencies");
  if (!block) {
    return null;
  }
  const lineStart = build.lastIndexOf("\n", block.close) + 1;
  const closingIndent = build.slice(lineStart, block.close).match(/^\s*/)[0];
  const before = build.slice(0, block.close).trimEnd();
  return `${before}\n${closingIndent}    implementation project(':${name}')\n${build.slice(
    block.close,
  )}`;
}

function addModuleJarDependency(build, name) {
  if (new RegExp(`dependsOn\\(\\s*['"]:${name}:jar['"]\\s*\\)`).test(build)) {
    return build;
  }
  return `${build.trimEnd()}\n\ntasks.named('jar') {\n    dependsOn(':${name}:jar')\n}\n`;
}

function findTopLevelBlock(content, name) {
  let depth = 0;
  for (let index = 0; index < content.length; index += 1) {
    const skippedTo = skipNonCode(content, index);
    if (skippedTo !== null) {
      index = skippedTo - 1;
      continue;
    }
    if (content[index] === "{") {
      depth += 1;
      continue;
    }
    if (content[index] === "}") {
      depth -= 1;
      continue;
    }
    if (
      depth === 0 &&
      content.startsWith(name, index) &&
      !/[a-z0-9_$]/i.test(content[index - 1] ?? "") &&
      !/[a-z0-9_$]/i.test(content[index + name.length] ?? "")
    ) {
      let open = index + name.length;
      while (/\s/.test(content[open] ?? "")) {
        open += 1;
      }
      if (content[open] === "{") {
        const close = findClosingBrace(content, open);
        return close === null ? null : { open, close };
      }
    }
  }
  return null;
}

function findClosingBrace(content, open) {
  let depth = 0;
  for (let index = open; index < content.length; index += 1) {
    const skippedTo = skipNonCode(content, index);
    if (skippedTo !== null) {
      index = skippedTo - 1;
      continue;
    }
    if (content[index] === "{") {
      depth += 1;
    } else if (content[index] === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return null;
}

function skipNonCode(content, index) {
  if (content.startsWith("//", index)) {
    const newline = content.indexOf("\n", index + 2);
    return newline === -1 ? content.length : newline;
  }
  if (content.startsWith("/*", index)) {
    const end = content.indexOf("*/", index + 2);
    return end === -1 ? content.length : end + 2;
  }
  if (content.startsWith("$/", index)) {
    const end = content.indexOf("/$", index + 2);
    return end === -1 ? content.length : end + 2;
  }
  if (content[index] !== "'" && content[index] !== '"') {
    return null;
  }
  const quote = content[index];
  const delimiter = content.startsWith(quote.repeat(3), index)
    ? quote.repeat(3)
    : quote;
  let cursor = index + delimiter.length;
  while (cursor < content.length) {
    if (content.startsWith(delimiter, cursor)) {
      return cursor + delimiter.length;
    }
    cursor += content[cursor] === "\\" && delimiter.length === 1 ? 2 : 1;
  }
  return content.length;
}

function renderUiBuild(variables) {
  return renderInternalFiles("ui-build", variables)[0].content.trim();
}

function addUiBuild(build, fragment) {
  if (build.includes("processUiResources")) {
    return build;
  }
  return `${build.trimEnd()}\n\n${fragment}\n`;
}

function emptyPlan(projectPath) {
  return {
    projectPath,
    creates: [],
    patches: [],
    skips: [],
    conflicts: [],
  };
}

/**
 * Apply a previously computed project change.
 * @param {Object} plan Change plan
 */
export async function applyProjectChange(plan) {
  if (plan.conflicts.length > 0) {
    throw new Error(plan.conflicts.join("\n"));
  }

  for (const file of plan.creates) {
    const destPath = path.join(plan.projectPath, file.path);
    if (fs.existsSync(destPath)) {
      throw new Error(`File "${file.path}" already exists`);
    }
  }
  for (const file of plan.patches) {
    const destPath = path.join(plan.projectPath, file.path);
    if (
      !fs.existsSync(destPath) ||
      fs.readFileSync(destPath, "utf8") !== file.before
    ) {
      throw new Error(`File "${file.path}" changed after planning`);
    }
  }

  const createdPaths = [];
  const patchedFiles = [];
  try {
    for (const file of plan.creates) {
      const destPath = path.join(plan.projectPath, file.path);
      createdPaths.push(destPath);
      await fs.ensureDir(path.dirname(destPath));
      await fs.writeFile(destPath, file.content);
      await fs.chmod(destPath, file.mode);
    }
    for (const file of plan.patches) {
      const destPath = path.join(plan.projectPath, file.path);
      patchedFiles.push({
        path: destPath,
        content: file.before,
        mode: fs.statSync(destPath).mode & 0o777,
      });
      await fs.writeFile(destPath, file.after, "utf8");
    }
  } catch (error) {
    for (const file of patchedFiles.reverse()) {
      await fs.writeFile(file.path, file.content, "utf8");
      await fs.chmod(file.path, file.mode);
    }
    for (const createdPath of createdPaths.reverse()) {
      if (fs.existsSync(createdPath)) {
        await fs.remove(createdPath);
      }
      await removeEmptyParents(path.dirname(createdPath), plan.projectPath);
    }
    throw error;
  }
}

async function removeEmptyParents(directory, root) {
  let current = directory;
  while (current.startsWith(`${root}${path.sep}`)) {
    if (!fs.existsSync(current)) {
      current = path.dirname(current);
      continue;
    }
    if (
      !fs.statSync(current).isDirectory() ||
      fs.readdirSync(current).length > 0
    ) {
      return;
    }
    await fs.rmdir(current);
    current = path.dirname(current);
  }
}
