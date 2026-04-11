const fs = require("fs");
const pkg = require("../package.json");


function updatePkg() {
  pkg.version = updateVersion(pkg.version, Boolean(process.env.IMPORTANT), Boolean(process.env.MAJOR));
  tag = pkg.version;
  fs.writeFileSync("../package.json", JSON.stringify(pkg, null, 2));
}


/**
 * Update version of given string
 * @param { String } v - Current version
 * @param { boolean } isMore - Is the update important (updates 2nd digit)
 * @param { boolean } isMajor - Is it a major update (updates 1st digit)
 * @param { Object | string | import("fs").PathOrFileDescriptor } pkgJson - package.json contents or path
 * @returns { string } Updated version
 */
function updateVersion(v, isMore = false, isMajor = false, pkgJson = null) {
  let versionArr = v.split("."),
    newVersionArr = [];
  let lastNum, isChange;
  versionArr = versionArr.reverse();

  if (isMore && isMajor) throw new TypeError("Both parameters `isMore` and `isMajor` cannot be true.\nPlease select either of the one.");

  function ch() {
    isChange = true;
    return 0
  }

  versionArr.forEach((n, i) => {
    let num = parseInt(n),
      lNum = lastNum;
    lastNum = num;

    if ((i == 0 || isMore && i == versionArr.length - 2) && !isMajor) {
      num = num == 9 ? ch() : num + 1;
    }
    else if (lNum == 9 && isChange) {
      if (num == 9 && i != versionArr.length - 1) num = 0
      else {
        num += 1;
        isChange = false;
      }
    }
    else if (isMajor && i == versionArr.length - 1) num += 1;
    newVersionArr.push(num.toString());
  });

  let returnContent = newVersionArr.reverse().join('.');
  if(pkgJson) {
    if(typeof pkgJson == typeof {}) {
      pkgJson.version = returnContent;
      returnContent = pkgJson;
    }
    else if(typeof pkgJson == typeof "") {
      try {
      if(pkgJson.trim().startsWith("{")) {
          pkgJson = JSON.parse(pkgJson);
          pkgJson.version = returnContent;
          returnContent = pkgJson;
      } else {
        const pth = pkgJson;
        pkgJson = JSON.parse(fs.readFileSync(pth));
        pkgJson.version = returnContent;
        fs.writeFileSync(pth, JSON.stringify(pkgJson, null, 2));
        returnContent = pkgJson;
      }}
    catch (e) {console.error("Error", e); return returnContent}
  }
  return returnContent;
}
}

updatePkg();