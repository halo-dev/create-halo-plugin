---
name: halo-plugin-dev
description: >
  Create or modify Halo CMS plugins, including Java backend code, plugin.yaml and
  extension resources, Gradle and DevTools configuration, plugin APIs and lifecycle,
  and Vue-based Console or User Center UI. Use for Halo plugin implementation,
  migration, debugging, or integration work; do not use for theme-only changes.
---

# Halo Plugin Development

Work from the target plugin and fetch current Halo documentation only when the
task needs a Halo-specific contract. Do not rely on API details embedded in the
skill or recalled from training data.

## Establish the Target

- Inspect the existing Gradle files, `src/main/resources/plugin.yaml`, UI package
  manifest and build configuration, and nearby implementations before editing.
- Determine both the Halo platform dependency and `plugin.yaml` `spec.requires`.
  Do not silently raise the requirement or switch the UI build format.
- Preserve an existing plugin's structure and tooling. For a new plugin, prefer
  the official `pnpm create halo-plugin` scaffold unless the user chose another
  starting point.

## Fetch Documentation on Demand

1. Start with the [plugin documentation index](https://docs.halo.run/developer-guide/plugin/index.md)
   when the task involves Halo plugin APIs, configuration, lifecycle, UI, DevTools,
   security, or integration contracts.
2. Use the complete [Halo documentation index](https://docs.halo.run/llms.txt)
   only when the route is unclear or the task crosses documentation sections.
3. Fetch only the Markdown pages relevant to the current task. Do not load
   `llms-full.txt` by default.
4. For version-sensitive work, also read the [plugin API changelog](https://docs.halo.run/developer-guide/plugin/api-changelog.md),
   then verify exact signatures and behavior against the target dependency,
   source, or existing callers. The target version wins over current-site docs.

If online docs are unavailable, continue from the target checkout and dependency
sources when possible, and disclose what could not be verified instead of guessing.

## Halo-Specific Boundaries

- Keep blocking work off reactive WebFlux paths; follow the current
  [reactive development guide](https://docs.halo.run/developer-guide/plugin/basics/server/reactive-development.md).
- Reuse Halo-provided UI components, FormKit inputs, shared utilities, and the
  project's installed build tooling before adding dependencies or custom equivalents.
- Use Setting YAML for ordinary plugin settings instead of creating a duplicate
  settings route. Use FormKit for page and modal forms, and reuse Halo list,
  search, modal, feedback, and permission components before native replacements;
  follow the current [forms and page components guide](https://docs.halo.run/developer-guide/plugin/basics/ui/forms.md).
- Use the project's `generateApiClient` task to generate TypeScript models and API
  methods from custom models and documented `SpringdocRouteBuilder` endpoints.
  Reuse Halo's `axiosInstance`; do not handwrite generated resource types or create
  a separate Axios client for `/api` or `/apis`. Follow the current
  [API request guide](https://docs.halo.run/developer-guide/plugin/api-reference/ui/api-request.md).
- Treat generated API clients and built UI assets as generated files: change their
  inputs and use the project's generator or build task rather than editing output.
- Store passwords, tokens, API keys, and private keys in Halo `Secret`, never in a
  ConfigMap or custom-model spec. Validate user-controlled outbound destinations
  against SSRF and redirect risks before attaching credentials, and keep public
  APIs or security switches closed when configuration loading fails. Follow the
  current [outbound HTTP guide](https://docs.halo.run/developer-guide/plugin/security/outbound-http.md).
- Add RoleTemplates only when non-super-admin or anonymous access is required;
  grant the narrowest permissions needed.

## Verify

Use the project's existing Gradle and UI scripts. Run the narrowest relevant tests
and checks, and verify packaging when manifest, UI output, or generated resources
affect the plugin JAR. When a runnable Halo instance is available, smoke-test the
changed Console, User Center, API, lifecycle, or theme integration path.
