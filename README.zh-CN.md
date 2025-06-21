# create-halo-plugin

简体中文 | [English](README.md)

🚀 快速创建 Halo 插件开发模板

一个用于创建 [Halo](https://www.halo.run) 插件项目的脚手架工具，提供现代化的开发环境。

## 特性

- 🎯 **交互式命令行** - 通过提示引导项目设置
- 🏗️ **现代构建工具** - 可选择 Vite 或 Rsbuild 进行 UI 开发
- 📦 **完整项目结构** - 预配置的 Gradle 构建、UI 设置和插件清单
- 📝 **TypeScript 支持** - 完整的 TypeScript 配置用于 UI 开发

## 快速开始

使用以下任一命令创建新的 Halo 插件项目：

```bash
# npm
npm create halo-plugin
npm create halo-plugin my-plugin

# pnpm (推荐)
pnpm create halo-plugin
pnpm create halo-plugin my-plugin

# yarn
yarn create halo-plugin
yarn create halo-plugin my-plugin

# npx
npx create-halo-plugin
npx create-halo-plugin my-plugin
```

## 使用示例

### 使用自动生成的目录名创建

```bash
pnpm create halo-plugin
# 创建一个名为 "plugin-{你的插件名}" 的目录
```

### 在指定目录中创建

```bash
pnpm create halo-plugin my-awesome-plugin
# 在 "./my-awesome-plugin" 目录中创建项目
```

### 交互式设置

CLI 将引导你完成设置过程：

```bash
🚀 欢迎使用 Halo 插件创建器！

✔ 插件名称: › my-awesome-plugin
✔ 域名 (用于组和包名): › com.example
✔ 作者姓名: › 张三
✔ 选择 UI 构建工具: › Vite

📋 项目配置:
   名称: my-awesome-plugin
   域名: com.example
   包名: com.example.myawesomeplugin
   作者: 张三
   UI 工具: vite
   输出目录: /path/to/my-awesome-plugin

✔ 创建项目? › 是
```

## 项目结构

生成的项目包含：

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
│   ├── vite.config.ts (或 rsbuild.config.ts)
│   └── tsconfig.json
├── build.gradle
├── settings.gradle
├── gradlew
└── README.md
```

## 开发

创建项目后：

```bash
# 进入项目目录
cd my-plugin

# 启动 Halo 开发服务器
./gradlew haloServer

# 在另一个终端中，启动 UI 开发
cd ui
pnpm dev
```

## 系统要求

- **Node.js** >= 18.0.0
- **Java** >= 21
- **Halo** >= 2.21.0

## 插件名称规则

插件名称必须遵循以下模式：

- 以字母数字字符 (a-z, 0-9) 开头和结尾
- 中间可以包含连字符 (-) 和点 (.)
- 只允许小写字母
- 示例：`my-plugin`、`blog.comment`、`user-management`

## UI 构建工具

在两个现代构建工具中选择：

### Vite

- 🔧 简单配置
- 📦 优化构建

### Rsbuild

- 🚀 基于 Rspack 的高速构建
- 🛠️ 丰富的插件生态
- 📊 更好的构建性能
- 📦 支持代码分割，适用于更加大型的插件项目

## 命令

```bash
# 显示帮助
npx create-halo-plugin --help

# 显示版本
npx create-halo-plugin --version
```

## 贡献

我们欢迎贡献！请查看我们的 [贡献指南](CONTRIBUTING.md) 了解详情。

## 许可证

[GPL-3.0](LICENSE) © [Halo](https://github.com/halo-dev)

## 相关链接

- [Halo](https://halo.run) - 现代博客平台
- [Halo 文档](https://docs.halo.run) - 官方文档
- [插件开发指南](https://docs.halo.run/developer-guide/plugin/introduction)