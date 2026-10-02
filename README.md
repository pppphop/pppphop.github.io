# zhp 的博客

博客源码和发布流程统一放在本仓库中。线上地址：<https://pppphop.github.io/>。

## 文件位置

| 路径 | 用途 |
| --- | --- |
| `source/_posts/` | 文章 Markdown 和文章图片 |
| `layout/index.ejs` | 首页模板 |
| `layout/_partials/header/navigation.ejs` | 导航栏模板 |
| `source/css/blog-polish.css` | 自定义样式 |
| `source/js/` | 自定义浏览器脚本 |
| `source/quiz/`、`source/military/`、`source/ethics/`、`source/os/`、`source/history/`、`source/ai/` | 独立页面，HTML 内含各自的样式和交互 |
| `source/files/` | 下载附件和资料 |
| `_config.yml` | 博客、菜单、默认配色和公式渲染配置 |
| `scripts/` | Hexo 构建时的模板覆盖逻辑 |
| `public/` | 自动生成的静态网页，可查看但不直接编辑，不纳入 Git |
| `.github/workflows/deploy.yml` | GitHub 自动构建和部署配置 |

Fluid 的基础模板和样式来自 `hexo-theme-fluid` 依赖。需要定制时在仓库中保存模板覆盖或自定义 CSS/JS，避免直接修改 `node_modules/`。

## 本地编辑与预览

使用 Node.js 24 和 pnpm 11.25.0。

```sh
pnpm install --frozen-lockfile
pnpm run server
```

浏览器打开 `http://localhost:4000/`。修改文章、模板、样式或配置后查看效果。

生成静态网页：

```sh
pnpm run generate
```

生成结果在 `public/`。Windows 环境若没有全局 npm，也可使用 `tools\npm.cmd run generate`；日常操作推荐 pnpm。

## 发布

确认本地效果后，将修改提交并推送到 `main`：

```sh
git add .
git commit -m "Update blog"
git push origin main
```

GitHub Actions 会安装锁定的依赖、生成 `public/`，然后部署到 GitHub Pages。只发布生成的网页，源码、依赖和配置不进入网站发布包。构建或部署结果可在仓库的 Actions 页面查看，也可手动运行 `Build and deploy blog`。

## 恢复记录

源码由原静态站恢复，49 篇文章和独立页面都已保留。合并前的静态站版本在 Git 历史提交 `55f5776` 中，仍可查看或恢复。

`migration/migrate_one.py` 保留作为历史恢复工具，日常编辑和发布无需运行。需要再次恢复时，显式指定静态站快照与独立输出目录：

```sh
python migration/migrate_one.py --site-root PATH_TO_STATIC_SNAPSHOT --output-root PATH_TO_SEPARATE_OUTPUT --all
```
