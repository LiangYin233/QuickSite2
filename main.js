let ejs = require("ejs"),
    fs = require("fs-extra"),
    path = require("path"),
    parseMd = require("markdown-it"),
    metadataParser = require("markdown-yaml-metadata-parser"),
    yaml = require("js-yaml");

const postDir = path.join(process.cwd(), "\\posts\\");
const templateDir = path.join(process.cwd(), "\\template\\");
const buildDir = path.join(process.cwd(), "\\build\\");
const sourceDir = path.join(process.cwd(), "\\source\\");
const pluginsDir = path.join(process.cwd(), "\\plugins\\");

let postInformation = [];
let postLst = fs.readdirSync(postDir);
let templateLst = fs.readdirSync(templateDir);
let md = new parseMd();
let cfg = yaml.load(fs.readFileSync(path.join(process.cwd(), "\\cfg.yaml")));

if (process.argv[2] == "build") {
    console.time('Build in');
    // 依次获取文章信息
    for (let i = 0; i < postLst.length; i++) {
        let postText = fs.readFileSync(path.join(postDir, postLst[i])).toString();
        let metaData = metadataParser(postText);
        postInformation.push({
            metaData: metaData["metadata"],
            content: md.render(metaData["content"]),
            filename: path.basename(postLst[i], ".md"),
            birthTime: new Date(fs.statSync(path.join(postDir, postLst[i])).birthtime).toLocaleDateString(),
            changeTime: new Date(fs.statSync(path.join(postDir, postLst[i])).mtime).toLocaleDateString()
        });
    }

    // 创建文件夹
    if (!fs.existsSync("build"))
        fs.mkdirSync("build");
    if (!fs.existsSync("plugins"))
        fs.mkdirSync("plugins");
    if (!fs.existsSync(path.join("plugins", "config.json")))
        fs.writeFileSync(path.join("plugins", "config.json"), "[]");

    /* 依次渲染文章页面 */

    // 渲染index页面
    let indexHtml = ejs.render(fs.readFileSync(path.join(templateDir, "index.ejs"), "utf8"), {
        config: cfg,
        post: postInformation,
        filename: path.join(templateDir + 'index.ejs')
    });
    // 渲染文章页面
    let postHtmlArray = [];
    for (let i = 0; i < postLst.length; i++) {
        let postHtml = ejs.render(fs.readFileSync(path.join(templateDir, "posts.ejs"), "utf8"), {
            config: cfg,
            post: postInformation[i],
            filename: path.join(templateDir + 'index.ejs')
        });
        postHtmlArray.push(postHtml);
    }
    // 渲染其它页面
    let otherHtmlArray = [];
    for (let i = 0; i < templateLst.length; i++) {
        if (!["index.ejs", "posts.ejs"].includes(templateLst[i]) && !fs.lstatSync(path.join(templateDir, templateLst[i])).isDirectory()) {
            let otherHtml = ejs.render(fs.readFileSync(path.join(templateDir, templateLst[i]), "utf8"), {
                config: cfg,
                post: postInformation,
                filename: path.join(templateDir, 'index.ejs')
            });
            otherHtmlArray.push(otherHtml);
        }
    }

    // 输出页面
    // Index输出
    fs.writeFileSync(path.join(buildDir, "index.html"), indexHtml);

    // Posts输出
    for (let i = 0; i < postLst.length; i++) {
        fs.writeFileSync(path.join(buildDir, postInformation[i].filename + ".html"), postHtmlArray[i]);
    }

    // Other输出
    for (let i = 0; i < templateLst.length; i++) {
        if (templateLst[i] != "index.ejs" && templateLst[i] != "posts.ejs" && !fs.lstatSync(path.join(templateDir, templateLst[i])).isDirectory())
            fs.writeFileSync(path.join(buildDir, path.basename(templateLst[i], ".ejs") + ".html"), otherHtmlArray[i]);
    }

    // 移动源文件
    fs.copySync(sourceDir, buildDir);

    let pluginsConfig = JSON.parse(fs.readFileSync(path.join(pluginsDir, "config.json")));
    pluginsConfig.forEach(element => {
        console.info("Loaded " + element);
        const plugin = require(path.join(pluginsDir, element));
        plugin.load(cfg.plugin, postInformation, {
            sourceDir: sourceDir,
            pluginsDir: pluginsDir,
            postDir: postDir,
            buildDir: buildDir
        });
    });
    console.timeEnd('Build in');
} else if (process.argv[2] == "clean") {
    // 删除Build文件夹并再次创建
    fs.removeSync(buildDir);
    fs.mkdirSync(buildDir);
} else if (process.argv[2] == "new") {
    if (process.argv[3] != null) {
        fs.writeFileSync(path.join(postDir, process.argv[3] + ".md"), "---\ntitle: " + process.argv[3] + "\n---");
    } else
        console.log("Post isn't has title.");
}