export const templateConfig = {
  templateFiles: [
    "build.gradle.template",
    "settings.gradle.template",
    "README.md.template",
    "src/main/resources/plugin.yaml.template",
    "src/main/java/Plugin.java.template",
    "src/test/java/PluginTest.java.template",

    "ui/build.gradle.template",
    "ui/package.json.template",
    "ui/tsconfig.node.json.template",
    "ui/env.d.ts.template",
  ],

  conditionalFiles: {
    vite: ["ui/vite.config.ts"],
    rsbuild: ["ui/rsbuild.config.ts"],
  },
};

export function getFileProcessingConfig(uiTool) {
  return {
    templateFiles: templateConfig.templateFiles,
    conditionalFiles: templateConfig.conditionalFiles[uiTool] || [],
  };
}
