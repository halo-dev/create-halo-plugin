# create-halo-plugin

English | [简体中文](README.zh-CN.md)

🚀 Quickly create Halo plugin development templates

A scaffolding tool for creating [Halo](https://www.halo.run) plugin projects with modern development setup.

## Features

- 🎯 **Interactive CLI** - Guided project setup with prompts
- 🏗️ **Modern Build Tools** - Choose between Vite or Rsbuild for UI development
- 📦 **Complete Project Structure** - Pre-configured Gradle build, UI setup, and plugin manifest
- 📝 **TypeScript Support** - Full TypeScript configuration for UI development

## Quick Start

Create a new Halo plugin project using any of the following commands:

```bash
# npm
npm create halo-plugin
npm create halo-plugin my-plugin

# pnpm (recommended)
pnpm create halo-plugin
pnpm create halo-plugin my-plugin

# yarn
yarn create halo-plugin
yarn create halo-plugin my-plugin

# npx
npx create-halo-plugin
npx create-halo-plugin my-plugin
```

## Usage Examples

### Create with auto-generated directory name

```bash
pnpm create halo-plugin
# Creates a directory named "plugin-{your-plugin-name}"
```

### Create in a specific directory

```bash
pnpm create halo-plugin my-awesome-plugin
# Creates the project in "./my-awesome-plugin" directory
```

### Interactive Setup

The CLI will guide you through the setup process:

```bash
🚀 Welcome to Halo Plugin Creator!

✔ Plugin name: › my-awesome-plugin
✔ Domain (for group and package name): › com.example
✔ Author name: › John Doe
✔ Choose UI build tool: › Vite

📋 Project Configuration:
   Name: my-awesome-plugin
   Domain: com.example
   Package: com.example.myawesomeplugin
   Author: John Doe
   UI Tool: vite
   Output Directory: /path/to/my-awesome-plugin

✔ Create project? › yes
```

## Project Structure

The generated project includes:

```bash
my-plugin/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/myplugin/
│   │   │       └── MyPluginPlugin.java
│   │   └── resources/
│   │       ├── plugin.yaml
│   │       └── logo.png
│   └── test/
│       └── java/
│           └── com/example/myplugin/
│               └── MyPluginPluginTest.java
├── ui/
│   ├── src/
│   │   ├── index.ts
│   │   ├── views/
│   │   └── assets/
│   ├── package.json
│   ├── vite.config.ts (or rsbuild.config.ts)
│   └── tsconfig.json
├── build.gradle
├── settings.gradle
├── gradlew
└── README.md
```

## Development

After creating your project:

```bash
# Navigate to your project
cd my-plugin

# Start Halo development server
./gradlew haloServer

# In another terminal, start UI development
cd ui
pnpm dev
```

## Requirements

- **Node.js** >= 18.0.0
- **Java** >= 21
- **Halo** >= 2.21.0

## Plugin Name Rules

Plugin names must follow this pattern:

- Start and end with alphanumeric characters (a-z, 0-9)
- Can contain hyphens (-) and dots (.) in the middle
- Only lowercase letters allowed
- Examples: `my-plugin`, `blog.comment`, `user-management`

## UI Build Tools

Choose between two modern build tools:

### Vite

- 🔧 Simple configuration
- 📦 Optimized builds

### Rsbuild

- 🚀 Rspack-based for speed
- 🛠️ Rich plugin ecosystem
- 📊 Better build performance
- 📦 Code splitting, suitable for larger plugin projects

## Commands

```bash
# Show help
npx create-halo-plugin --help

# Show version
npx create-halo-plugin --version
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

[GPL-3.0](LICENSE) © [Halo](https://github.com/halo-dev)

## Related

- [Halo](https://www.halo.run) - Powerful and easy-to-use open source website builder
- [Halo Documentation](https://docs.halo.run) - Official documentation
- [Plugin Development Guide](https://docs.halo.run/developer-guide/plugin/introduction)