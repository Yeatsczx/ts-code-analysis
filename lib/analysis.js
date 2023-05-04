const path = require('path');                                                                                 // 路径处理
const tsCompiler = require('typescript');                                                                     // TS编译器
const chalk = require('chalk');                                                                               // 美化输出
const processLog = require('single-line-log');                                                                // 单行输出
const { scanFileTs,  getJsonContent } = require(path.join(__dirname, './file'));                              // 读写模块
const { parseTs } = require(path.join(__dirname, './parse'));                                                 // 解析模块
const { defaultScorePlugin } = require(path.join(__dirname, './score'));                                      // 评分模块                                     // 常量模块
const { methodPlugin } =require(path.join(__dirname, '../plugins/methodPlugin'))                              // method分析插件
const { typePlugin } =require(path.join(__dirname, '../plugins/typePlugin'))                                  // type分析插件
const { defaultPlugin } =require(path.join(__dirname, '../plugins/defaultPlugin'))                            // default分析插件

// 代码分析基础类
class CodeAnalysis {
  // options为analysis.config.js配置
  constructor(options) {
    // 私有属性
    this._scanSource = options.scanSource;                                             // 扫描源配置信息       
    this._analysisTarget = options.analysisTarget;                                     // 要分析的目标依赖配置           
    this._blackList = options.blackList || [];                                         // 需要标记的黑名单API配置            
    this._scorePlugin = options.scorePlugin || false;                                  // 代码评分插件配置
    this._analysisPlugins = options.analysisPlugins || [];                             // 代码分析插件配置
    // 公共属性
    this.pluginsQueue = [];                                                            // 依赖分析插件队列
    this.importItemMap = {};                                                           // importItem统计Map     
    // this.apiMap = {};                                                               // 未分类API统计Map            
    // this.typeMap = {};                                                              // 类型API统计Map
    // this.methodMap = {};                                                            // 方法API统计Map               
    this.versionMap = {};                                                              // 目标依赖安装版本信息    
    this.parseErrorInfos = [];                                                         // 解析异常信息
    this.diagnosisInfos = [];                                                          // 诊断日志信息           
    this.scoreMap = {};                                                                // 评分及建议Map          
  }
  // API黑名单标记
  _blackTag(queue) {
    if(queue.length>0){
      queue.forEach((item)=>{
        Object.keys(this[item.mapName]).forEach((apiName)=>{
          if(this._blackList.length>0 && this._blackList.includes(apiName)){          // 标记黑名单
            this[item.mapName][apiName].isBlack = true;
          }
        })
      })
    }
  }
  // 注册插件
  _installPlugins(plugins) {
    if(plugins.length>0){
      plugins.forEach((item)=>{                                   // install 自定义Plugin
        this.pluginsQueue.push(item(this));
      })
    }
    this.pluginsQueue.push(methodPlugin(this));                  // install methodPlugin
    this.pluginsQueue.push(typePlugin(this));                    // install typePlugin
    this.pluginsQueue.push(defaultPlugin(this));                 // install defaultPlugin
  }
  // 链式调用检查，找出链路顶点node
  _checkPropertyAccess(node, index =0, apiName='') {
    if(index>0){
      apiName = apiName + '.' + node.name.escapedText;
    }else{
      apiName = apiName + node.escapedText;
    }
    if(tsCompiler.isPropertyAccessExpression(node.parent)){
      index++;
      return this._checkPropertyAccess(node.parent, index, apiName);
    }else{                                                                                                                         
      return {
        baseNode :node, 
        depth: index,
        apiName: apiName
      };                                                                                                
    }
  }
  // 执行Target分析插件队列中的checkFun函数
  _runAnalysisPlugins(tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName,  line) {
    if(this.pluginsQueue.length>0){
      for(let i=0; i<this.pluginsQueue.length; i++){
        const checkFun = this.pluginsQueue[i].checkFun;
        if(checkFun(this, tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName,  line)){
          break;
        }
      }
    }
  }
  // 执行Target分析插件队列中的afterHook函数
  _runAnalysisPluginsHook(importItems, ast, checker, filePath, projectName,  baseLine) {
    if(this.pluginsQueue.length>0){
      for(let i=0; i<this.pluginsQueue.length; i++){
        const afterHook = this.pluginsQueue[i].afterHook;
        if(afterHook && typeof afterHook ==='function'){
          afterHook(this, this.pluginsQueue[i].mapName, importItems, ast, checker, filePath, projectName,  baseLine);
        }
      }
    }
  }
  // 分析import引入
  // 遍历其所有 import 节点，分析并记录从目标依赖中导入的 API 信息，排除非目标依赖项的干扰
  _findImportItems(ast, filePath, baseLine = 0) {
    let importItems = {};
    let that = this;

    // 处理imports相关map
    function dealImports(temp){
      importItems[temp.name] = {};
      importItems[temp.name].origin = temp.origin;
      importItems[temp.name].symbolPos = temp.symbolPos;
      importItems[temp.name].symbolEnd = temp.symbolEnd;
      importItems[temp.name].identifierPos = temp.identifierPos;
      importItems[temp.name].identifierEnd = temp.identifierEnd;
      
      if (!that.importItemMap[temp.name]) {
        that.importItemMap[temp.name] = {};
        that.importItemMap[temp.name].callOrigin = temp.origin;
        that.importItemMap[temp.name].callFiles = [];
        that.importItemMap[temp.name].callFiles.push(filePath);
      } else {
        that.importItemMap[temp.name].callFiles.push(filePath);
      }
    }

    // 遍历AST寻找import节点
    function walk(node) {
      // console.log(node);
      tsCompiler.forEachChild(node, walk);
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;
      
      // 分析引入情况
      if(tsCompiler.isImportDeclaration(node)){
        // 命中target
        // that._analysisTarget表示Import语句from 后面的部分
        if(node.moduleSpecifier && node.moduleSpecifier.text && node.moduleSpecifier.text == that._analysisTarget){
          // 存在导入项
          if(node.importClause){  
            // default直接全局导入场景
            if(node.importClause.name){
              let temp = {
                name: node.importClause.name.escapedText, // 导入后在代码中真实调用使用的 API 名
                origin: null, // API 别名。null则表示该非别名导入，name就是原本名字
                symbolPos: node.importClause.pos, // symbol指向的声明节点在代码字符串中的起始位置
                symbolEnd: node.importClause.end, // symbol指向的声明节点在代码字符串中的结束位置
                identifierPos: node.importClause.name.pos, // API 名字信息节点在代码字符串中的起始位置
                identifierEnd: node.importClause.name.end, // API 名字信息节点在代码字符串中的结束位置
                line: line // 导入 API 的import语句所在代码行信息
              };
              dealImports(temp);
            }
            if(node.importClause.namedBindings){
              // 拓展引入场景，包含as情况
              if (tsCompiler.isNamedImports(node.importClause.namedBindings)) {   
                if(node.importClause.namedBindings.elements && node.importClause.namedBindings.elements.length>0) {
                  // console.log(node.importClause.namedBindings.elements);
                  const tempArr = node.importClause.namedBindings.elements;
                  tempArr.forEach(element => {
                    if (tsCompiler.isImportSpecifier(element)) {
                      let temp = {
                        name: element.name.escapedText,
                        origin: element.propertyName ? element.propertyName.escapedText : null,
                        symbolPos: element.pos,
                        symbolEnd: element.end,
                        identifierPos: element.name.pos,
                        identifierEnd: element.name.end,
                        line: line
                      };
                      dealImports(temp);
                    }
                  });
                }
              }
              // * 全局导入as场景
              if (tsCompiler.isNamespaceImport(node.importClause.namedBindings) && node.importClause.namedBindings.name){
                let temp = {
                  name: node.importClause.namedBindings.name.escapedText,
                  origin: '*', 
                  symbolPos: node.importClause.namedBindings.pos,
                  symbolEnd: node.importClause.namedBindings.end,
                  identifierPos: node.importClause.namedBindings.name.pos,
                  identifierEnd: node.importClause.namedBindings.name.end,
                  line: line
                };
                dealImports(temp);
              }
            }
          }
        }
      }
    }
    walk(ast);
    // console.log(importItems);
    return importItems;
  }
  // AST分析
  _dealAST(importItems, ast, checker, filePath, projectName,  baseLine = 0) {
    const that = this;
    const importItemNames = Object.keys(importItems);
    
    // 遍历AST
    function walk(node) {
      // console.log(node);
      tsCompiler.forEachChild(node, walk);
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + baseLine + 1;
      
      // target analysis
      // 判定当前遍历的节点是否为isIdentifier类型节点，
      // 判断从Import导入的API中是否存在与当前遍历节点名称相同的API
      if(tsCompiler.isIdentifier(node) && node.escapedText && importItemNames.length>0 && importItemNames.includes(node.escapedText)) {
        const matchImportItem = importItems[node.escapedText];
        // console.log(matchImportItem);
        // 排除importItem Node自身
        if(node.pos !=matchImportItem.identifierPos && node.end !=matchImportItem.identifierEnd){ 
          // 利用symbolPos 和 symbolEnd 排除局部同名节点的干扰
          const symbol = checker.getSymbolAtLocation(node);
          // console.log(symbol);
          if(symbol && symbol.declarations && symbol.declarations.length>0){    // 存在上下文声明
            const nodeSymbol = symbol.declarations[0];
            // 上下文声明与import item匹配, 符合API调用
            if(matchImportItem.symbolPos == nodeSymbol.pos && matchImportItem.symbolEnd == nodeSymbol.end){                                     
              if(node.parent){
                // _checkPropertyAccess链式调用检查，找出链路顶点node
                const { baseNode, depth, apiName } = that._checkPropertyAccess(node);                                                           // 获取基础分析节点信息
                that._runAnalysisPlugins(tsCompiler, baseNode, depth, apiName, matchImportItem, filePath, projectName,  line);         // 执行分析插件                                              // 执行分析插件
              }else{
                // Identifier节点如果没有parent属性，说明AST节点语义异常，不存在分析意义
              }
            }else{
              // 上下文非importItem API但与其同名的Identifier节点
            }
          }
        }
      }
    }

    walk(ast);
    // 执行afterhook
    this._runAnalysisPluginsHook(importItems, ast, checker, filePath, projectName,  baseLine);
  }
  // 扫描文件
  // scanSource是analysis.config-.js中的待扫描源码的配置信息，为数组
  _scanFiles(scanSource) {
    let entrys = []; 
    scanSource.forEach((item)=>{
      const entryObj = {
        name: item.name,
      }
      let parse = []; // 完整的路径，包括process.cwd()
      let show = [];// 不完整的路径
      const scanPath = item.path;
      scanPath.forEach((sitem)=>{
        //tempEntry表示扫描一个文件目录得到的该文件中所有的TS和TSX文件路径信息
        let tempEntry = [];
        tempEntry = scanFileTs(sitem);
        let tempPath = tempEntry.map((titem)=>{
            return titem.substring(titem.indexOf(sitem));
        })
        parse = parse.concat(tempEntry);
        show = show.concat(tempPath);
      })
      entryObj.parse = parse;
      entryObj.show = show;
      entrys.push(entryObj);
    })
    // console.log(entrys);
    return entrys;
  }
  // 扫描文件，分析代码
  _scanCode(scanSource) {
    let entrys = this._scanFiles(scanSource);
    // console.log(entrys);
    entrys.forEach((item)=>{
      const parseFiles = item.parse;
      if(parseFiles.length>0){
        parseFiles.forEach((element, eIndex) => {
          const showPath = item.name + '&' + item.show[eIndex];
          try {
              const { ast, checker } = parseTs(element);                                                          // 解析ts文件代码,将其转化为AST
              const importItems = this._findImportItems(ast, showPath);                                           // 从import语句中获取导入的需要分析的目标API
              // console.log(importItems);
              if(Object.keys(importItems).length>0){
                this._dealAST(importItems, ast, checker, showPath, item.name);                     // 递归分析AST，统计相关信息
              }
          } catch (e) {
            const info = {
              projectName: item.name,
              file: item.show[eIndex],
              stack: e.stack
            }
            this.parseErrorInfos.push(info);
            this.addDiagnosisInfo(info);
          }
          processLog.stdout(chalk.green(`\n${item.name} ts分析进度: ${eIndex+1}/${parseFiles.length}`));
        });
      }
    })
  }
  // 目标依赖安装版本收集
  _targetVersionCollect(scanSource, analysisTarget) {
    scanSource.forEach((item)=>{
      if(item.packageFile && item.packageFile !=''){
        try{
          const lockInfo = getJsonContent(item.packageFile);
          // console.log(lockInfo);
          const temp = Object.keys(lockInfo.dependencies);
          if (temp.length > 0) {
            temp.forEach(element => {
              if (element == analysisTarget) {
                const version = lockInfo.dependencies[element];
                if (!this.versionMap[version]) {
                  this.versionMap[version] = {};
                  this.versionMap[version].callNum = 1;
                  this.versionMap[version].callSource = [];
                  this.versionMap[version].callSource.push(item.name);
                } else {
                  this.versionMap[version].callNum++;
                  this.versionMap[version].callSource.push(item.name);
                }    
              }
            });
          }
        }catch(e){
          // console.log(e);
        }
      }
    })
  }
  // 记录诊断日志
  addDiagnosisInfo(info) {
    this.diagnosisInfos.push(info);
  }
  // 入口函数
  analysis() {
    // 注册插件
    this._installPlugins(this._analysisPlugins);
    // 扫描分析TS
    this._scanCode(this._scanSource);
    // 黑名单标记
    this._blackTag(this.pluginsQueue);
    // 目标依赖安装版本收集
    this._targetVersionCollect(this._scanSource, this._analysisTarget);
    // 代码评分
    if(this._scorePlugin){
        if(typeof(this._scorePlugin) ==='function'){
          this.scoreMap = this._scorePlugin(this);
        }
        if(this._scorePlugin ==='default'){
          this.scoreMap = defaultScorePlugin(this);
        }
    }else{
      this.scoreMap = null;
    }
    // console.log(this.apiMap);
    // console.log(this.methodMap);
    // console.log(this.typeMap);
    // console.log(this.versionMap);
    // console.log(this.parseErrorInfos);
    // console.log(this.diagnosisInfos);
    // console.log(this.scoreMap);
  }
}

module.exports = CodeAnalysis;
