# create-halo-plugin

English | [简体中文](README.zh-CN.md)

🚀 Quickly create Halo plugin development templates

A scaffolding tool for creating [Halo](https://www.halo.run) plugin projects with modern development setup.

## Features

- 🎯 **Interactive CLI** - Guided project setup with prompts
- 🏗️ **Modern Build Tools** - Choose between Vite or Rsbuild for UI development
- 📦 **Complete Project Structure** - Pre-configured Gradle build, UI setup, and plugin manifest
- 📝 **TypeScript Support** - Full TypeScript configuration for UI development
- ➕ **Incremental Setup** - Add UI or a publishable Java module to an existing plugin

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
✔ Include UI project? › yes
✔ Choose UI build tool: › Vite

📋 Project Configuration:
   Name: my-awesome-plugin
   Domain: com.example
   Package: com.example.myawesomeplugin
   Author: John Doe
   Include UI: Yes
   UI Tool: vite
   Output Directory: /path/to/my-awesome-plugin

✔ Create project? › yes
```

### Creating Backend-Only Plugins

If your plugin doesn't need a user interface, you can skip UI project creation via command line:

```bash
pnpm create halo-plugin my-backend-plugin --name=my-backend-plugin --domain=com.example --author="John Doe" --includeUI=false
```

Or select "no" when prompted to include a UI project during interactive setup.

### Add UI Later

Run the command from an existing Halo plugin root:

```bash
npx create-halo-plugin add ui --tool vite
# or
npx create-halo-plugin add ui --tool rsbuild
```

The command shows the files it will create or update before applying the
change. Repeating the same command is a no-op. Existing `ui/` directories and
unrecognized Gradle layouts are left untouched.

### Add a Publishable Java Module

```bash
npx create-halo-plugin add module api
```

This creates the Java source and test structure, Maven Central publishing
configuration, module README, and `.github/workflows/publish.yml`. It also
includes the module in `settings.gradle` and adds it as an implementation
dependency of the root plugin.

The publishing workflow publishes snapshots from `main` and releases from
`v*` tags. Configure these repository secrets before publishing:
`MAVEN_CENTRAL_USERNAME`, `MAVEN_CENTRAL_PASSWORD`, `SIGNING_KEY`,
`SIGNING_KEY_ID`, and `SIGNING_PASSWORD`.

## Project Structure

### Full Project with UI

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

### Backend-Only Project (without UI)

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
├── build.gradle
├── settings.gradle
├── gradlew
└── README.md
```

## Development

### Projects with UI

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

### Backend-Only Projects

For projects without UI:

```bash
# Navigate to your project
cd my-plugin

# Start Halo development server
./gradlew haloServer
```

## Requirements

- **Node.js** >= 22.0.0 for the CLI; >=22.12.0 for generated UI projects
- **Java** >= 21
- **Halo** >= 2.26.0

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

## Command Line Options

```bash
# Show help
npx create-halo-plugin --help

# Show version
npx create-halo-plugin --version

# Create project with command line arguments
npx create-halo-plugin my-plugin \
  --name=my-plugin \
  --domain=com.example \
  --author="John Doe" \
  --includeUI \
  --uiTool=rsbuild

# Create backend-only project
npx create-halo-plugin my-backend-plugin \
  --name=my-backend-plugin \
  --domain=com.example \
  --author="John Doe" \
  --includeUI=false
```

Available options:

- `-n, --name <name>` - Plugin name
- `-d, --domain <domain>` - Domain for group and package name
- `-a, --author <author>` - Author name
- `-i, --includeUI` - Include UI project
- `-u, --uiTool <tool>` - UI build tool (rsbuild or vite, required when includeUI is true)
- `-h, --help` - Show help message
- `-v, --version` - Show version number

Incremental commands inspect the actual Groovy Gradle configuration and do not
depend on generator comments. Kotlin DSL is not supported. A Java module
requires an identifiable top-level `dependencies` block; ambiguous structures
are rejected instead of overwritten.

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

[GPL-3.0](LICENSE) © [Halo](https://github.com/halo-dev)

## Related

- [Halo](https://www.halo.run) - Powerful and easy-to-use open source website builder
- [Halo Documentation](https://docs.halo.run) - Official documentation
- [Plugin Development Guide](https://docs.halo.run/developer-guide/plugin/introduction)
