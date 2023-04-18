<<<<<<< HEAD
# ts-code-analysis
A code dependency analysis tool for ts
=======
<<<<<<< HEAD
# ts-code-analysis
A code dependency analysis tool for ts
=======
[![npm version](https://badge.fury.io/js/code-analysis-ts.svg)](https://www.npmjs.com/package/code-analysis-ts)
[![Downloads](https://img.shields.io/npm/dm/code-analysis-ts.svg)](https://www.npmjs.com/package/code-analysis-ts)

# code-analysis-ts

[code-analysis-ts](https://www.npmjs.com/package/code-analysis-ts)是一款前端代码分析工具，用于实现代码调用分析报告，代码评分，代码告警，“脏调用”拦截，API 趋势变化分析等应用场景。支持 CLI/API 两种使用模式，可快速集成到前端工程化体系中，用于解决大型 web 应用的前端依赖治理难题。

## Install

```javascript
npm install code-analysis-ts --save-dev
// or
yarn add code-analysis-ts --dev
```

## Config

新建 analysis.config.js 配置文件:

```javascript
const { execSync } = require("child_process"); // 子进程操作
const DefaultBranch = "master"; // 默认分支常量
function getGitBranch() {
  // 获取当前分支
  try {
    const branchName = execSync("git symbolic-ref --short -q HEAD", {
      encoding: "utf8",
    }).trim();
    // console.log(branchName);
    return branchName;
  } catch (e) {
    return DefaultBranch;
  }
}

module.exports = {
  scanSource: [
    {
      // 必须，待扫描源码的配置信息
      name: "Market", // 必填，项目名称
      path: ["src"], // 必填，需要扫描的文件路径（基准路径为配置文件所在路径）
      packageFile: "package.json", // 可选，package.json 文件路径配置，用于收集依赖的版本信息
    },
  ],
  analysisTarget: "framework", // 必须，要分析的目标依赖名
  analysisPlugins: [], // 可选，自定义分析插件，默认为空数组，一般不需要配置
  blackList: ["app.localStorage.set"], // 可选，需要标记的黑名单api，默认为空数组
  reportDir: "report", // 可选，生成代码分析报告的目录，默认为'report',不支持多级目录配置
  reportTitle: "Market依赖调用分析报告", // 可选，分析报告标题，默认为'依赖调用分析报告'
  scorePlugin: true, // 可选，是否要运行默认评分插件，默认为false表示不评分
  alarmThreshold: 90, // 可选，开启代码告警的阈值分数(0-100)，默认为null表示关闭告警逻辑 (CLI模式生效)
};
```

## Mode

### 1. cli

```javascript
// package.json 片段，添加bin command到npm script
...
"scripts": {
    "analysis": "ca analysis"
}
...

$ npm run analysis
// or
$ yarn analysis
```

### 2. api

```javascript
const analysis = require("code-analysis-ts"); // 代码分析包
const { execSync } = require("child_process"); // 子进程操作
const DefaultBranch = "master"; // 默认分支常量
function getGitBranch() {
  // 获取当前分支
  try {
    const branchName = execSync("git symbolic-ref --short -q HEAD", {
      encoding: "utf8",
    }).trim();
    // console.log(branchName);
    return branchName;
  } catch (e) {
    return DefaultBranch;
  }
}

async function scan() {
  try {
    const { report, diagnosisInfos } = await analysis({
      scanSource: [
        {
          // 必须，待扫描源码的配置信息
          name: "Market", // 必填，项目名称
          path: ["src"], // 必填，需要扫描的文件路径（基准路径为配置文件所在路径）
          packageFile: "package.json", // 可选，package.json 文件路径配置，用于收集依赖的版本信息
        },
      ],
      analysisTarget: "framework", // 必须，要分析的目标依赖名
      analysisPlugins: [], // 可选，自定义分析插件，默认为空数组，一般不需要配置
      blackList: ["app.localStorage.set"], // 可选，需要标记的黑名单api，默认为空数组
      reportDir: "report", // 可选，生成代码分析报告的目录，默认为'report',不支持多级目录配置
      reportTitle: "Market依赖调用分析报告", // 可选，分析报告标题，默认为'依赖调用分析报告'
      scorePlugin: true, // 可选，是否要运行默认评分插件，默认为false表示不评分
    });
    // console.log(report);
    // console.log(diagnosisInfos);
  } catch (e) {
    console.log(e);
  }
}

scan();
```

## Demo

[code-demo](https://github.com/liangxin199045/code-demo)演示如何使用 code-analysis-ts 的 demo 项目,使用 github pages 部署代码分析报告

## analysisPlugin 说明

自定义分析插件，分析工具内置插件有 type 分析，method 分析，默认 api 分析三个插件，如果开发者有更多分析指标的诉求，可以开发特定分析插件(比如分析 Class 类型的 api，分析用于三目运算符表达式中的 api,分析导入再导出 api 等场景)，开发分析插件需要对源码和分析工具架构及生命周期有一定的理解。

## 自定义插件库

[code-analysis-plugins](https://www.npmjs.com/package/code-analysis-plugins)是与分析工具配套的分析插件库，用于分享一些常用指标分析插件。

## diagnosisInfos 诊断日志说明

诊断日志是在代码分析过程中插件及关键节点产生的错误信息记录，可以帮助开发者调试自定义插件，快速定位代码文件，代码行，AST 节点等相关错误信息。
>>>>>>> 5d9b359... update
>>>>>>> 1b55ecf... update
