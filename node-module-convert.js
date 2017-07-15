#!/usr/lib/jvm/java-1.8.0/bin/jjs

var files = Packages.java.nio.file.Files;
var paths = Packages.java.nio.file.Paths;
var system = Packages.java.lang.System;
var utf8 = Packages.java.nio.charset.StandardCharsets.UTF_8;
var replace = Packages.java.nio.file.StandardCopyOption.REPLACE_EXISTING;

var prefix = "define(function(){var require = WILTON_requiresync;var module = {exports: {}};var exports = module.exports;";
var postfix = "return module.exports;});";


if (1 != arguments.length) {
    print("Error: invalid arguments");
    print("Usage: jjs node-module-convert.js path/to/module");
    system.exit(1);
}

function convert(modname, path) {
    if (!path.getFileName().toString().endsWith(".js")) {
       return;
    }
    print("converting: " + path);
    var tmppath = paths.get(path.toString() + ".tmp");
    var input = files.newBufferedReader(path, utf8);
    var output = files.newBufferedWriter(tmppath, utf8);
    var line = input.readLine();
    if (prefix !== line) {
        output.write(prefix);
        output.write("\n");
    }
    while(null !== line) {
        line = line.replace(new RegExp("(require\\(\\'|\\\")\\.\\.?\\/", "g"), "\$1" + modname + "/");
        output.write(line);
        output.write("\n");
        line = input.readLine();
    }
    if (postfix !== line) {
        output.write("\n");
        output.write(postfix);
    }
    output.write("\n");
    input.close();
    output.close();
    files.move(tmppath, path, replace);
}

function walkAndConvert(modname, dirpath) {
    var st = files.newDirectoryStream(dirpath);
    for each (pa in st) {
        if(!pa.getFileName().toString().startsWith(".")) {
            if (files.isDirectory(pa)) {
                walkAndConvert(modname, pa);
            } else {
                convert(modname, pa);
            }
        }
    }
    st.close();
}

var pa = paths.get(arguments[0]);
walkAndConvert(pa.getFileName().toString(), pa);
