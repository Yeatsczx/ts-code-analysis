# ts-code-analysis

# A code dependency analysis tool for ts

[![npm version](https://badge.fury.io/js/ts-code-analysis.svg)](https://www.npmjs.com/package/ts-code-analysis)
[![Downloads](https://img.shields.io/npm/dm/ts-code-analysis.svg)](https://www.npmjs.com/package/ts-code-analysis)

# ts-code-analysis

[ts-code-analysis](https://www.npmjs.com/package/ts-code-analysis)是一款前端代码分析工具，用于实现代码调用分析报告，支持 CLI/API 两种使用模式，代码评分，代码告警，“脏调用”拦截，API 趋势变化分析等应用场景。

## Install

```javascript
npm install ts-code-analysis --save-dev
// or
yarn add ts-code-analysis --dev
```

## Config

新建 analysis.config.js 配置文件:

```javascript
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
const analysis = require("ts-code-analysis"); // 代码分析包

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
  alarmThreshold: 90, // 可选，开启代码告警的阈值分数(0-100)，默认为null表示关闭告警逻辑 (CLI模式生效)
};);
    // console.log(report);
    // console.log(diagnosisInfos);
  } catch (e) {
    console.log(e);
  }
}

scan();
```
