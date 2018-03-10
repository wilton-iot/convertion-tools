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

// jjs -cp path/to/closure-compiler.jar node-module-wrap.js -- path/to/module

var files = Packages.java.nio.file.Files;
var paths = Packages.java.nio.file.Paths;
var system = Packages.java.lang.System;
var utf8 = Packages.java.nio.charset.StandardCharsets.UTF_8;
var replace = Packages.java.nio.file.StandardCopyOption.REPLACE_EXISTING;

var prefix = "define(function(localRequire, exports, module) { var requireOrig = require; require = localRequire;";
var postfix = "require = requireOrig;});";


if (1 !== arguments.length) {
    print("Error: invalid arguments");
    print("Usage: jjs node-module-wrap.js -- path/to/module");
    system.exit(1);
}

function wrap(modname, path) {
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
        line = line.replace(new RegExp("(require\\((:?\\'|\\\"))\\.\\.?\\/", "g"), "\$1" + modname + "/");
        line = line.replace(new RegExp("(require\\((:?\\'|\\\")[a-zA-Z0-9\\-]+)\\/(\\'|\\\")", "g"), "\$1\$2");
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

function walkAndWrap(modname, dirpath) {
    var st = files.newDirectoryStream(dirpath);
    for each (pa in st) {
        if(!pa.getFileName().toString().startsWith(".")) {
            if (files.isDirectory(pa)) {
                walkAndWrap(modname, pa);
            } else {
                wrap(modname, pa);
            }
        }
    }
    st.close();
}

var pa = paths.get(arguments[0]);
walkAndWrap(pa.getFileName().toString(), pa);
