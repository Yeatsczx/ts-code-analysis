const tsCompiler = require('typescript');                                             // TS编译器

// 解析ts文件代码，获取ast，checker
exports.parseTs = function(fileName) {
    // 将ts代码转化为AST
    const program = tsCompiler.createProgram([fileName], {})
    const ast = program.getSourceFile(fileName);
    const checker = program.getTypeChecker();
    // console.log(ast);
    return { ast, checker };
}