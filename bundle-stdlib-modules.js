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

// jjs -cp path/to/closure-compiler.jar bundle-stdlib-modules.js -- path/to/modules path/to/modules_min

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

var fileExcludes = {
    "bower.json": true,
    "composer.json": true,
    "Makefile": true,
    "package-lock.json": true,
    "wilton-sanity-test.js": true
};

var dirPrefixExcludes = [
    "."
];

var filePrefixExcludes = [
    ".",
    "LICENSE",
    "LICENCE",
    "appveyor.yml"
];

var filePostfixExcludes = [
    ".min.js",
    ".md"
];

function isModuleExcluded(pa) {
    var fname = pa.getFileName().toString();
    if (fname.startsWith(".")) {
        return true;
    }
    var pjpath = paths.get(pa, "package.json");
    return !files.isRegularFile(pjpath);
}

function isDirExcluded(pa, excludes) {
    var fname = pa.getFileName().toString();
    if (fname.startsWith(".")) {
        return true;
    }
    for each (expath in excludes) {
        if (expath.equals(pa)) {
            return true;
        }
    }
    return false;
}

function isFileExcluded(pa, excludes) {
    var fname = pa.getFileName().toString();
    if (true === fileExcludes[fname]) {
        return true;
    }
    for each (pref in filePrefixExcludes) {
        if (fname.startsWith(pref)) {
            return true;
        }
    }
    for each (post in filePostfixExcludes) {
        if (fname.endsWith(post)) {
            return true;
        }
    }
    for each (expath in excludes) {
        if (expath.equals(pa)) {
            return true;
        }
    }
    return false;
}

function isPreMinified(pa, minList) {
    for each (en in minList) {
        if (pa.toString().equals(en.toString())) {
            return true;
        }
    }
    return false;
}

function readConfig(modpath) {
    var pjpath = paths.get(modpath, "package.json");
    var pjstr = new JString(files.readAllBytes(pjpath), utf8);
    var pj = JSON.parse(pjstr);
    if (!("object" === typeof(pj.wilton) && pj.wilton.excludes instanceof Array)) {
        throw new Error("'wilton.excludes' entry not found in package descriptor: [" + pjpath.toString() + "]");
    }
    return pj.wilton;
}

function minifyFile(inFile, outFile) {
    var compiler = new Compiler();
    var options = new CompilerOptions();
    options.setLanguageIn(languageMode.ECMASCRIPT5);
    options.setLanguageOut(languageMode.NO_TRANSPILE);
    options.setWarningLevel(diagnosticGroups.NON_STANDARD_JSDOC, checkLevel.OFF);
    options.setWarningLevel(diagnosticGroups.CHECK_USELESS_CODE, checkLevel.OFF);
    options.setWarningLevel(diagnosticGroups.MISPLACED_TYPE_ANNOTATION, checkLevel.OFF);
    compilationLevel.SIMPLE_OPTIMIZATIONS.setOptionsForCompilationLevel(options);
    var inPath = paths.get(inFile);
    var code = new JString(files.readAllBytes(inPath), utf8);
    compiler.compile([], [sourceFile.fromCode(inPath.getFileName().toString(), code)], options);
    files.write(paths.get(outFile), compiler.toSource().getBytes(utf8));
}

function listDirectory(dir) {
    var iter = files.newDirectoryStream(paths.get(dir));
    var list = [];
    for each (pa in iter) {
        list.push(pa);
    }
    iter.close();
    list.sort(function(a, b) {
        return a.toString().compareTo(b.toString());
    });
    return list;
}

function walkAndMinify(inDir, outDir, modcfg, minify) {
    files.createDirectories(paths.get(outDir));
    var list = listDirectory(inDir);
    for each (pa in list) {
        var fname = pa.getFileName().toString();
        var inPath = paths.get(inDir, fname);
        var outPath = paths.get(outDir, fname);
        if (null === modcfg) { // top level dir, top level scripts are ignored
            if (files.isDirectory(pa) && !isModuleExcluded(pa)) { 
                var cfg = readConfig(pa.toString());
                if (true !== cfg.excludeModule) {
                    var collectedExcludes = [];
                    for each (en in cfg.excludes) {
                        collectedExcludes.push(paths.get(pa, en));
                    }
                    var collectedPreMin = [];
                    for each (en in cfg.preMinifiedFiles) {
                        collectedPreMin.push(paths.get(pa, en));
                    }
                    var mcfg = {
                        excludes: collectedExcludes,
                        preMinifiedFiles: collectedPreMin
                    };
                    print("module: [" + fname + "]");
                    walkAndMinify(inPath.toString(), outPath.toString(), mcfg, minify);
                }
            }
        } else {
            if (files.isDirectory(pa)) {
                if (!isDirExcluded(pa, modcfg.excludes)) {
                    // print("  directory: [" + inPath.toString() + "]");
                    walkAndMinify(inPath.toString(), outPath.toString(), modcfg, minify);
                }
            } else if (!isFileExcluded(pa, modcfg.excludes)) {
                if (fname.endsWith(".js")) {
                    // print("    script: [" + inPath.toString() + "]");
                    if (minify) {
                        if (isPreMinified(inPath, modcfg.preMinifiedFiles)) {
                            // print("    minscript: [" + inPath.toString() + "]");
                            var minPath = paths.get(inPath.getParent(), fname.substr(0, fname.length - 3) + ".min.js");
                            files.copy(minPath, outPath);
                        } else {
                            minifyFile(inPath.toString(), outPath.toString());
                        }
                    } else {
                        files.copy(inPath, outPath);
                    }
                } else {
                    // print("    file: [" + inPath.toString() + "]");
                    files.copy(inPath, outPath);
                }
            }
        }
    }
}

walkAndMinify(arguments[0], arguments[1], null, "minified" === arguments[2]);


