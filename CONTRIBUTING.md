# Contributing to create-halo-plugin

Thanks for helping improve `create-halo-plugin`.

## Development setup

You need:

- Node.js 22 or later
- pnpm 10.33.0 (the version declared in `package.json`)
- Java 21 when building a generated plugin

Install the repository dependencies:

```bash
pnpm install --frozen-lockfile
```

## Making changes

- Update `src/` for CLI and project-generation behavior.
- Update `template/` for files that should appear in generated projects.
- Do not edit a generated sample project instead of its source template.
- Update `pnpm-lock.yaml` with pnpm only when repository dependencies change.

Keep changes focused. Avoid committing generated projects, build output, or
unrelated formatting changes.

## Verification

Format and lint the CLI source:

```bash
pnpm test
pnpm check
git diff --check
```

`pnpm check` applies fixes to `src/` and `test/`, so review the resulting diff.

For changes to the generator or templates, generate a fresh project and build
it. This is the same Rsbuild path covered by CI:

```bash
node index.js build/my-plugin \
  --name=my-plugin \
  --domain=run.halo.plugin \
  --author=halo \
  --includeUI \
  --uiTool=rsbuild

cd build/my-plugin
./gradlew build
```

On Windows, use `gradlew.bat build` instead. Generate into an empty directory;
the CLI intentionally refuses to overwrite a non-empty one.

Test every variant affected by your change:

- Use `--uiTool=vite` for the Vite template.
- Use `--includeUI=false` without `--uiTool` for a backend-only plugin.
- Test Rsbuild, Vite, and backend-only generation when changing shared template
  or generator behavior.
- Run `create-halo-plugin add ui` against a backend-only project when changing
  incremental UI behavior.
- Run `create-halo-plugin add module api` when changing
  multi-module behavior.
- Verify `./gradlew :api:generatePomFileForMavenPublication` and inspect the
  generated POM when changing module publishing metadata.

CI also generates and builds an Rsbuild-based plugin on Linux and Windows.

## Pull requests

- Keep each pull request limited to one concern.
- Explain what changed, why it changed, and which commands you ran.
- Link related issues when applicable.
- Use a clear, imperative English commit subject; no special prefix is needed.
- Confirm the generated project contains only the intended changes.
