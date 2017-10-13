#!/usr/lib/jvm/java-1.8.0/bin/jjs

// jjs -cp ../closure-compiler-v20170626.jar minify-modules.js -- path/to/modules path/to/modules_min

var Compiler = Packages.com.google.javascript.jscomp.Compiler;
var checkLevel = Packages.com.google.javascript.jscomp.CheckLevel;
var compilationLevel = Packages.com.google.javascript.jscomp.CompilationLevel;
var diagnosticGroups = Packages.com.google.javascript.jscomp.DiagnosticGroups;
var files = Packages.java.nio.file.Files;
var CompilerOptions = Packages.com.google.javascript.jscomp.CompilerOptions;
var languageMode = com.google.javascript.jscomp.CompilerOptions.LanguageMode;
var paths = Packages.java.nio.file.Paths;
var JString = Packages.java.lang.String;
var sourceFile = com.google.javascript.jscomp.SourceFile;
var system = Packages.java.lang.System;
var utf8 = Packages.java.nio.charset.StandardCharsets.UTF_8;

function minifyFile(inFile, outFile) {
    var inPath = paths.get(inFile);
    if (!files.exists(inPath)) {
        print("ERROR: input file doesn't exist: [" + inFile + "]");
        return;
    }
    var outPath = paths.get(outFile);
    if (files.exists(outPath)) {
        print("ERROR: output file already exists: [" + outFile + "]");
        return;
    }
    var compiler = new Compiler();
    var options = new CompilerOptions();
    options.setLanguageIn(languageMode.ECMASCRIPT_2017);
    options.setLanguageOut(languageMode.ECMASCRIPT5);
    options.setWarningLevel(diagnosticGroups.NON_STANDARD_JSDOC, checkLevel.OFF);
    options.setWarningLevel(diagnosticGroups.CHECK_USELESS_CODE, checkLevel.OFF);
    compilationLevel.SIMPLE_OPTIMIZATIONS.setOptionsForCompilationLevel(options);
    var code = new JString(files.readAllBytes(inPath), utf8);
    compiler.compile([], [sourceFile.fromCode(inPath.getFileName().toString(), code)], options);
    files.write(outPath, compiler.toSource().getBytes(utf8));
}

minifyFile(arguments[0], arguments[1]);
