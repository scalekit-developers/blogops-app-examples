const fs = require("fs");
const path = require("path");

function fixFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  // Replace extensionless local imports (./ and ../) with .js
  content = content.replace(/(from\s+['"](\.\/|\.\.\/)[^'".]+?)(?<!\.js)(['"])/g, "$1.js$3");
  fs.writeFileSync(filePath, content, "utf8");
}

function walk(dir) {
  for (const file of fs.readdirSync(dir)) {
    const full = path.join(dir, file);
    if (fs.statSync(full).isDirectory()) walk(full);
    else if (full.endsWith(".js")) fixFile(full);
  }
}

walk(path.join(__dirname, "../dist"));
console.log("Fixed .js extensions in dist/");
