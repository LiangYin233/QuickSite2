const fs = require("fs");
const path = require('path');
const xml2js = require('xml2js');

let fileLst = new Array();
let dirs = new Object();
let cfg;
let sitemap = {
    urlset: []
};

function removeElement(arr, item) {
    return arr.filter(function(i) {
        return i != item;
    });
}

function load(config, postInfo, dirsObj) {
    cfg = config;
    dirs = dirsObj;
    sitemapLstGen(dirs);
    fs.writeFileSync(path.join(dirs.buildDir, "sitemap.xml"), new xml2js.Builder().buildObject(sitemap));
}

function sitemapLstGen(dirs) {
    fileLst = fs.readdirSync(dirs.buildDir);
    fileLst.forEach(element => {
        if (path.extname(element) != ".html")
            fileLst = removeElement(fileLst, element);
        if (fs.statSync(dirs.buildDir + element).isDirectory()) {
            fileLst = removeElement(fileLst, element);
        }
    });
    fileLst.forEach(element => {
        sitemap.urlset.push({
            loc: cfg.url + element,
            lastmod: new Date(fs.statSync(path.join(dirs.buildDir, element)).birthtime).toISOString()
        });
    });
}

module.exports = {
    load
};