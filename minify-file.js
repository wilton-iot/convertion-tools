#!/usr/lib/jvm/java-1.8.0/bin/jjs

/*
 * Copyright 2017, alex at staticlibs.net
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

// jjs -cp path/to/closure-compiler.jar minify-file.js -- path/to/file.js path/to/file.min.js

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
    options.setLanguageIn(languageMode.ECMASCRIPT5);
    options.setLanguageOut(languageMode.ECMASCRIPT5);
    options.setWarningLevel(diagnosticGroups.NON_STANDARD_JSDOC, checkLevel.OFF);
    options.setWarningLevel(diagnosticGroups.CHECK_USELESS_CODE, checkLevel.OFF);
    compilationLevel.SIMPLE_OPTIMIZATIONS.setOptionsForCompilationLevel(options);
    var code = new JString(files.readAllBytes(inPath), utf8);
    compiler.compile([], [sourceFile.fromCode(inPath.getFileName().toString(), code)], options);
    files.write(outPath, compiler.toSource().getBytes(utf8));
}

minifyFile(arguments[0], arguments[1]);
