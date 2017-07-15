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

var moduleExcludes = {
    "nbproject": true,
    "underscore": true, // used to test lodash only
    "validator": true // very slow to load in duktape
};

var fileExcludes = {
    "bower.json": true,
    "Makefile": true,
    "LICENSE": true,
    "wilton-sanity-test.js": true
};

var dirPrefixExcludes = [
    "."
];

var filePrefixExcludes = [
    ".",
    "LICENSE",
    "LICENCE"
];

var filePostfixExcludes = [
    ".min.js",
    ".md"
];

function isModuleExcluded(pa) {
    var fname = pa.getFileName().toString();
    if (true === moduleExcludes[fname]) {
        return true;
    }
    for each (pref in dirPrefixExcludes) {
        if (fname.startsWith(pref)) {
            return true;
        }
    }
    return false;
}

function isDirExcluded(pa, excludes) {
    var fname = pa.getFileName().toString();
    for each (pref in dirPrefixExcludes) {
        if (fname.startsWith(pref)) {
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

function readExcludes(modpath) {
    var pjpath = paths.get(modpath, "package.json");
    var pjstr = new JString(files.readAllBytes(pjpath), utf8);
    var pj = JSON.parse(pjstr);
    if (!("object" === typeof(pj.wilton) && pj.wilton.excludes instanceof Array)) {
        throw new Error("'wilton.excludes' entry not found in package descriptor: [" + pjpath.toString() + "]");
    }
    return pj.wilton.excludes;
}

function minifyFile(inFile, outFile) {
    var compiler = new Compiler();
    var options = new CompilerOptions();
    options.setLanguageIn(languageMode.ECMASCRIPT_2017);
    options.setLanguageOut(languageMode.ECMASCRIPT5);
    options.setWarningLevel(diagnosticGroups.NON_STANDARD_JSDOC, checkLevel.OFF);
    options.setWarningLevel(diagnosticGroups.CHECK_USELESS_CODE, checkLevel.OFF);
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

function walkAndMinify(inDir, outDir, excludes) {
    files.createDirectories(paths.get(outDir));
    var list = listDirectory(inDir);
    for each (pa in list) {
        var fname = pa.getFileName().toString();
        var inPath = paths.get(inDir, fname);
        var outPath = paths.get(outDir, fname);
        if (null === excludes) { // top level dir, top level scripts are ignored
            if (files.isDirectory(pa) && !isModuleExcluded(pa)) { 
                var excludesStrings = readExcludes(pa.toString());
                var collectedExcludes = [];
                for each (en in excludesStrings) {
                    collectedExcludes.push(paths.get(pa, en));
                }            
                print("module: [" + fname + "]");
                walkAndMinify(inPath.toString(), outPath.toString(), collectedExcludes);
            }
        } else {
            if (files.isDirectory(pa)) {
                if (!isDirExcluded(pa, excludes)) {
                    print("  directory: [" + inPath.toString() + "]");
                    walkAndMinify(inPath.toString(), outPath.toString(), excludes);
                }
            } else if (!isFileExcluded(pa, excludes)) {
                if (fname.endsWith(".js")) {
                    print("    script: [" + inPath.toString() + "]");
                    minifyFile(inPath.toString(), outPath.toString());
                } else {
                    print("    file: [" + inPath.toString() + "]");
                    files.copy(inPath, outPath);
                }
            }
        }
    }
}

walkAndMinify(arguments[0], arguments[1], null);


