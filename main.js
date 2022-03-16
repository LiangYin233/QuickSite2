let ejs = require("ejs"),
    fs = require("fs-extra"),
    path = require("path"),
    parseMd = require("markdown-it"),
    metadataParser = require("markdown-yaml-metadata-parser"),
    yaml = require("js-yaml");

const postDir = path.normalize(process.cwd() + "\\posts");
const templateDir = path.normalize(process.cwd() + "\\template");
const buildDir = path.normalize(process.cwd() + "\\build");
const sourceDir = path.normalize(process.cwd() + "\\source");

let postInformation = [];
let postLst = fs.readdirSync(postDir);
let templateLst = fs.readdirSync(templateDir);
let md = new parseMd();
let cfg = yaml.load(fs.readFileSync(path.normalize(process.cwd() + "\\cfg.yaml")));

if (process.argv[2] == "build") {
    console.time('Build in');
    // 依次获取文章信息
    for (let i = 0; i < postLst.length; i++) {
        let postText = fs.readFileSync(postDir + path.normalize("\\" + postLst[i])).toString();
        let metaData = metadataParser(postText);
        postInformation.push({
            metaData: metaData["metadata"],
            content: md.render(metaData["content"]),
            filename: path.basename(postLst[i], ".md"),
            birthTime: new Date(fs.statSync(postDir + path.normalize("\\" + postLst[i])).birthtime).toLocaleDateString(),
            changeTime: new Date(fs.statSync(postDir + path.normalize("\\" + postLst[i])).mtime).toLocaleDateString()
        });
    }


    /* 依次渲染文章页面 */

    // 渲染index页面
    let indexHtml = ejs.render(fs.readFileSync(templateDir + path.normalize("\\index.ejs"), "utf8"), {
        config: cfg,
        post: postInformation,
        filename: templateDir + path.normalize('\\index.ejs')
    });
    // 渲染文章页面
    let postHtmlArray = [];
    for (let i = 0; i < postLst.length; i++) {
        let postHtml = ejs.render(fs.readFileSync(templateDir + path.normalize("\\posts.ejs"), "utf8"), {
            config: cfg,
            post: postInformation[i],
            filename: templateDir + path.normalize('\\index.ejs')
        });
        postHtmlArray.push(postHtml);
    }
    // 渲染其它页面
    let otherHtmlArray = [];
    for (let i = 0; i < templateLst.length; i++) {
        if (templateLst[i] != "index.ejs" && templateLst[i] != "posts.ejs" && !fs.lstatSync(templateDir + path.normalize("\\" + templateLst[i])).isDirectory()) {
            let otherHtml = ejs.render(fs.readFileSync(templateDir + path.normalize("\\" + templateLst[i]), "utf8"), {
                config: cfg,
                post: postInformation,
                filename: templateDir + path.normalize('\\index.ejs')
            });
            otherHtmlArray.push(otherHtml);
        }
    }

    // 输出页面
    // Index输出
    fs.writeFileSync(buildDir + path.normalize("\\index.html"), indexHtml);

    // Posts输出
    for (let i = 0; i < postLst.length; i++) {
        fs.writeFileSync(buildDir + path.normalize("\\" + postInformation[i].filename + ".html"), postHtmlArray[i]);
    }

    // Other输出
    for (let i = 0; i < templateLst.length; i++) {
        if (templateLst[i] != "index.ejs" && templateLst[i] != "posts.ejs" && !fs.lstatSync(templateDir + path.normalize("\\" + templateLst[i])).isDirectory())
            fs.writeFileSync(buildDir + path.normalize("\\" + path.basename(templateLst[i], ".ejs") + ".html"), otherHtmlArray[i]);
    }

    // 移动源文件
    fs.copySync(path.normalize(process.cwd() + "\\source\\"), buildDir + path.normalize("\\"));
    console.timeEnd('Build in');
} else if (process.argv[2] == "clean") {
    // 删除Build文件夹并再次创建
    fs.removeSync(buildDir);
    fs.mkdirSync(buildDir);
} else if (process.argv[2] == "new") {
    if (process.argv[3] != null) {
        fs.writeFileSync(postDir + path.normalize("\\" + process.argv[3] + ".md"), "---\ntitle: " + process.argv[3] + "\n---");
    } else
        console.log("Post isn't has title.");
}