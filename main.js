let ejs = require("ejs"),
    fs = require("fs-extra"),
    path = require("path"),
    parseMd = require("markdown-it"),
    metadataParser = require("markdown-yaml-metadata-parser"),
    yaml = require("js-yaml");

// 若不存在,创建必要文件
if (!fs.existsSync("build"))
    fs.mkdirSync("build");
if (!fs.existsSync("posts"))
    fs.mkdirSync("posts");
if (!fs.existsSync("plugins"))
    fs.mkdirSync("plugins");
if (!fs.existsSync(path.join("plugins", "config.json")))
    fs.writeFileSync(path.join("plugins", "config.json"), "[]");

const postDir = path.join(process.cwd(), "\\posts\\");
const templateDir = path.join(process.cwd(), "\\template\\");
const buildDir = path.join(process.cwd(), "\\build\\");
const sourceDir = path.join(process.cwd(), "\\source\\");
const pluginsDir = path.join(process.cwd(), "\\plugins\\");

let cfg = yaml.load(fs.readFileSync(path.join(process.cwd(), "\\cfg.yaml")));
let pluginsConfig = JSON.parse(fs.readFileSync(path.join(pluginsDir, "config.json")));
let pluginsLst = {
    beforeBuild: [],
    afterBuild: [],
    new: []
};
pluginsConfig.forEach(element => {
    console.info("Loading " + element);
    const plugin = require(path.join(pluginsDir, element));
    let types = plugin.register();
    types.forEach(type => {
        if (type == "beforeBuild")
            pluginsLst.beforeBuild.push(element);
        else if (type == "afterBuild")
            pluginsLst.afterBuild.push(element);
        else if (type == "new")
            pluginsLst.new.push(element);
        else
            console.error("An error was encountered while loading " + element);
    });
    console.info("Loaded " + element);
});

if (process.argv[2] == "build") {
    console.time('Build in');

    let postInformation = [];
    let postLst = fs.readdirSync(postDir);
    let templateLst = fs.readdirSync(templateDir);

    // 依次获取文章信息
    postLst.forEach(filename => {
        let metaData = metadataParser(fs.readFileSync(path.join(postDir, filename)).toString());
        postInformation.push({
            metaData: metaData["metadata"],
            content: new parseMd().render(metaData["content"]),
            filename: path.basename(filename, ".md"),
            birthTime: new Date(fs.statSync(path.join(postDir, filename)).birthtime).toLocaleDateString(),
            changeTime: new Date(fs.statSync(path.join(postDir, filename)).mtime).toLocaleDateString()
        });
    });

    // 加载插件
    pluginsLst.beforeBuild.forEach(element => {
        const plugin = require(path.join(pluginsDir, element));
        postInformation = plugin.load({
            config: cfg.plugin,
            postInfo: postInformation,
            dirUrls: {
                sourceDir: sourceDir,
                pluginsDir: pluginsDir,
                postDir: postDir,
                buildDir: buildDir
            }
        }, "beforeBuild");
    });

    /* 依次渲染文章页面 */

    // 渲染index页面
    let indexHtml = ejs.render(fs.readFileSync(path.join(templateDir, "index.ejs"), "utf8"), {
        config: cfg,
        post: postInformation,
        filename: path.join(templateDir + 'index.ejs')
    });
    fs.writeFileSync(path.join(buildDir, "index.html"), indexHtml);
    // 渲染文章页面
    for (let i = 0; i < postLst.length; i++) {
        let postHtml = ejs.render(fs.readFileSync(path.join(templateDir, "posts.ejs"), "utf8"), {
            config: cfg,
            post: postInformation[i],
            filename: path.join(templateDir + 'index.ejs')
        });
        fs.writeFileSync(path.join(buildDir, postInformation[i].filename + ".html"), postHtml);
    }
    // 渲染其它页面
    for (let i = 0; i < templateLst.length; i++) {
        if (!["index.ejs", "posts.ejs"].includes(templateLst[i]) && !fs.statSync(path.join(templateDir, templateLst[i])).isDirectory()) {
            let otherHtml = ejs.render(fs.readFileSync(path.join(templateDir, templateLst[i]), "utf8"), {
                config: cfg,
                post: postInformation,
                filename: path.join(templateDir, 'index.ejs')
            });
            fs.writeFileSync(path.join(buildDir, path.basename(templateLst[i], ".ejs") + ".html"), otherHtml);
        }
    }

    // 移动源文件
    fs.copySync(sourceDir, buildDir);

    // 加载插件
    pluginsLst.afterBuild.forEach(element => {
        const plugin = require(path.join(pluginsDir, element));
        plugin.load({
            config: cfg.plugin,
            postInfo: postInformation,
            dirUrls: {
                sourceDir: sourceDir,
                pluginsDir: pluginsDir,
                postDir: postDir,
                buildDir: buildDir
            }
        }, "afterBuild");
    });

    console.timeEnd('Build in');
} else if (process.argv[2] == "clean") {
    // 删除Build文件夹并再次创建
    fs.removeSync(buildDir);
    fs.mkdirSync(buildDir);
} else if (process.argv[2] == "new") {
    if (process.argv[3] != null)
        fs.writeFileSync(path.join(postDir, process.argv[3] + ".md"),
            `---\ntitle: ${ process.argv[3] }\n---`
        );
    else
        console.log("Post isn't has title.");
    pluginsLst.new.forEach(element => {
        const plugin = require(path.join(pluginsDir, element));
        plugin.load({
            dirUrls: {
                sourceDir: sourceDir,
                pluginsDir: pluginsDir,
                postDir: postDir,
                buildDir: buildDir
            },
            config: cfg.plugin
        }, "new");
    });
}