# CMake 与 VSCode 项目构建体系详解

在现代 C++ 开发中，我们几乎不再使用原生的 `g++` 命令行去手动编译项目。相反，我们使用 **CMake** 作为跨平台的项目描述工具，再配合 **VSCode** 编辑器作为轻量化的 IDE，形成了一套强大而高效的构建生态。

本篇将深入剖析 CMake 核心构建逻辑（基于 Target 的现代设计模式），并详解 VSCode 的构建与调试配置文件体系（CMakePresets、tasks.json、launch.json）。

---

## 1. 现代 CMake 的核心设计理念：基于 Target

在传统的 CMake 中，大家习惯使用全局变量（如 `include_directories`、`link_libraries`）来控制编译。但在现代 CMake（3.0+）中，推崇的是 **基于 Target（目标）的面向对象式设计**。

### 1.1 什么是 Target？
Target 是构建系统的核心产物。它通常指**一个可执行文件**（Executable）或**一个库文件**（Library）。
* `add_executable(app main.cpp)` $\rightarrow$ 创建一个名为 `app` 的可执行文件目标。
* `add_library(utils utils.cpp)` $\rightarrow$ 创建一个名为 `utils` 的库文件目标。

### 1.2 基于属性（Property）的传递与依赖管理
每个 Target 都有自己的属性，如包含路径（Include Directories）、编译选项（Compile Options）、依赖的库（Link Libraries）。我们通过以下三个修饰符控制属性的传递范围：
* **`PRIVATE`**：只在当前 Target 内部编译时生效，不传递给依赖它的其他目标。
* **`INTERFACE`**：当前 Target 编译时不使用，但任何链接依赖该 Target 的其他目标在编译时必须使用。
* **`PUBLIC`**：等同于 `PRIVATE + INTERFACE`。

```cmake
# 示例：创建工具库并导出包含目录
add_library(utils utils.cpp)
target_include_directories(utils PUBLIC ${CMAKE_CURRENT_SOURCE_DIR}/include)

# 创建主程序并链接工具库
add_executable(app main.cpp)
target_link_libraries(app PRIVATE utils) 
# 💡 app 链接 utils 时，会自动继承 utils 导出的 PUBLIC 头文件目录，无需手动重复包含！
```

---

## 2. 跨平台标准化配置：CMakePresets.json

在跨平台团队开发中，不同的开发者可能使用不同的编译器（MSVC / GCC）和构建生成器（MSBuild / Ninja）。为了统一编译配置，CMake 引入了 `CMakePresets.json` 预设机制。

`CMakePresets.json` 将构建流程标准化为三个阶段的预设：
1. **Configure Presets（配置阶段预设）**：指定生成器、编译器路径、构建目录（如 `build/windows-debug`）。
2. **Build Presets（构建阶段预设）**：指定调用编译时的参数（如并发线程数、编译配置类型 Debug/Release）。
3. **Test Presets（测试阶段预设）**：集成 CTest 自动化测试的执行预设。

VSCode 的 CMake Tools 插件会自动读取此文件，提供一键切换平台/配置的下拉菜单。

---

## 3. VSCode 的构建与调试配置文件体系

VSCode 是一个文本编辑器，要让它具备编译和调试的能力，必须依靠 `.vscode` 目录下的三个核心 JSON 配置文件：

```
                       ┌────────────────────────┐
                       │     CMakePresets.json  │ <-- 提供平台预设配置
                       └───────────┬────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         ▼                         ▼                         ▼
 ┌───────────────┐         ┌───────────────┐         ┌───────────────┐
 │  tasks.json   │         │  launch.json  │         │ settings.json │
 └───────────────┘         └───────────────┘         └───────────────┘
  (执行编译任务)            (调用调试器)              (编辑器环境设置)
```

### 3.1 tasks.json（任务管理器）
负责执行各种前置或编译命令。例如，我们定义一个“编译当前 CMake 项目”的任务：
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "CMake Build",
            "type": "shell",
            "command": "cmake",
            "args": [
                "--build",
                "--preset",
                "windows-debug" // 调用 CMake 预设直接进行编译
            ],
            "group": "build"
        }
    ]
}
```

### 3.2 launch.json（调试加载器）
负责调用底层调试器（如 GDB、LLDB 或 MSVC 的 VSDBG）并加载生成的可执行文件，配合 CMake 插件，可以直接定位 target 目标：
```json
{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "CMake Target Debug",
            "type": "cppvsdbg", // MSVC 调试器类型，Linux 下通常为 cppdbg
            "request": "launch",
            // 💡 自动绑定 CMake 插件编译出的可执行文件目标，无需硬编码路径
            "program": "${command:cmake.launchTargetPath}", 
            "args": [],
            "cwd": "${workspaceFolder}",
            // 💡 调试前自动执行 tasks.json 中定义的编译任务
            "preLaunchTask": "CMake Build" 
        }
    ]
}
```

### 3.3 settings.json（工作区设置）
存放项目级别的自定义环境变量、插件配置。例如：
```json
{
    "cmake.configureOnOpen": true, // VSCode 打开项目时自动进行 CMake 配置
    "cmake.buildDirectory": "${workspaceFolder}/build/${buildType}"
}
```
通过上述三个配置文件的分工配合，我们就可以在 VSCode 中实现类似 Visual Studio 的 **“一键编译+断点调试”** 的丝滑体验。
