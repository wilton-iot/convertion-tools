#!/usr/lib/jvm/java-1.8.0/bin/jjs

/*
 * Copyright 2018, alex at staticlibs.net
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// jjs -cp path/to/closure-compiler.jar bundle-stdlib-modules.js -- path/to/modules path/to/modules_min

var AbstractCommandLineRunner = Packages.com.google.javascript.jscomp.AbstractCommandLineRunner;
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


function transpileFile(inFile, outFile) {
    var compiler = new Compiler();
    var options = new CompilerOptions();
    options.setLanguageIn(languageMode.ECMASCRIPT_NEXT);
    options.setLanguageOut(languageMode.ECMASCRIPT5);
    options.setWarningLevel(diagnosticGroups.NON_STANDARD_JSDOC, checkLevel.OFF);
    options.setWarningLevel(diagnosticGroups.CHECK_USELESS_CODE, checkLevel.OFF);
    options.setWarningLevel(diagnosticGroups.MISPLACED_TYPE_ANNOTATION, checkLevel.OFF);
    options.setPrettyPrint(true);
    options.setLineBreak(true);
    compilationLevel.BUNDLE.setOptionsForCompilationLevel(options);
    var externs = AbstractCommandLineRunner.getBuiltinExterns(options.getEnvironment());
    var inPath = paths.get(inFile);
    var code = new JString(files.readAllBytes(inPath), utf8);
    compiler.compile(externs, [sourceFile.fromCode(inPath.getFileName().toString(), code)], options);
    files.write(paths.get(outFile), compiler.toSource().getBytes(utf8));
}

function listDirectory(dir) {
    var iter = files.newDirectoryStream(paths.get(dir));
    var list = [];
    for each (pa in iter) {
        if (!pa.getFileName().toString().startsWith(".")) {
            list.push(pa);
        }
    }
    iter.close();
    list.sort(function(a, b) {
        return a.toString().compareTo(b.toString());
    });
    return list;
}

function walkAndTranspile(inDir, outDir) {
    files.createDirectories(paths.get(outDir));
    var list = listDirectory(inDir);
    for each (pa in list) {
        var fname = pa.getFileName().toString();
        var inPath = paths.get(inDir, fname);
        var outPath = paths.get(outDir, fname);
        if (files.isDirectory(pa)) {
            print("  directory: [" + inPath.toString() + "]");
            walkAndTranspile(inPath.toString(), outPath.toString());
        } else {
            if (fname.endsWith(".js") || fname.endsWith(".es")) {
                print("    script: [" + inPath.toString() + "]");
                transpileFile(inPath.toString(), outPath.toString());
            } else {
                print("    file: [" + inPath.toString() + "]");
                files.copy(inPath, outPath);
            }
        }
    }
}

if (2 !== arguments.length) {
    print("Error: invalid arguments");
    print("Usage: jjs transpile-to-es5.js -- file_or_dir.es file_or_dir.js");
    system.exit(1);
}

if (files.isDirectory(paths.get(arguments[0]))) {
    walkAndTranspile(arguments[0], arguments[1]);
} else {
    print("script: [" + arguments[0] + "]");
    transpileFile(arguments[0], arguments[1]);
}
