# 秋音棠 Akineto · UTAU 声库配布站

角色「秋音棠（Akineto）」的声库配布网站，纯静态、全站简体中文。

- 首页 / 角色 / 声库 / 下载 / 使用条款 / 教程 FAQ / 公告 / 制作名单，共 8 个页面
- 两款声库：**VCV 连续音** 与 **连单（单独音＋VC）**，UTAU 与 OpenUtau 通用，BowlRoll 配布，解压密码 **0719**
- 无构建步骤、无框架、无外部 CDN（离线可用，字体用系统中文字体）
- 响应式（375px 起）、明暗双主题、下载前条款勾选、密码一键复制、FAQ 手风琴、试听播放器

---

## 1. 本地预览

```bash
cd utau-site
python -m http.server 8000
# 打开 http://localhost:8000
```

直接双击 `index.html` 也能看；用本地服务器更接近线上行为。

---

## 2. 目录结构

```text
utau-site/
├─ index.html            首页（立绘 / 两款声库卖点 / 试听 / 公告）
├─ character.html        角色（资料表 / 设定 / 两套立绘 / 二次创作）
├─ voicebank.html        声库详情（规格 / VCV 与连单 / 导入方法）
├─ download.html         下载（两张卡片 / 密码 0719 / 条款勾选 / 三步导入）
├─ terms.html            使用条款
├─ guide.html            使用教程 + FAQ + 术语表
├─ credits.html          制作名单
├─ news.html             公告 + 配布信息
├─ favicon.ico           由头像生成
├─ assets/
│  ├─ css/style.css      全站样式（配色集中在 :root）
│  ├─ js/main.js         主题 / 导航 / 下载门禁 / 复制 / 动画
│  ├─ art/
│  │  ├─ akineto-stand.webp   主立绘（透明背景）
│  │  ├─ akineto-alt.webp     第二套立绘（透明背景）
│  │  ├─ akineto-icon.jpg     头像（OGP / 头像）
│  │  └─ akineto-mark.png     站点小头像（页头页脚 logo）
│  ├─ icon/apple-touch-icon.png
│  └─ audio/demo-01..03.wav   示例试听（合成音，需替换）
├─ data/
│  ├─ character.json     角色数据（机器可读）
│  └─ voicebank.json     声库数据（两个 BowlRoll 链接、密码）
└─ tools/
   ├─ make_demo_audio.py 生成示例试听音频
   └─ init_repo.py       用 dulwich 初始化本地 Git 仓库（环境无 git 时用）
```

页面是静态 HTML，`data/*.json` 不参与渲染，改内容时以 HTML 为准并同步 JSON。

---

## 3. 要改什么，改哪里

| 内容 | 位置 |
|---|---|
| 角色资料（年龄、生日、中之人…） | `character.html` 的 `.specs` + `data/character.json` |
| 中之人 / 制作名单 | `character.html`、`voicebank.html`、`credits.html`、页面页脚 |
| 连单原音设定署名（蓝色肥猫） | `voicebank.html` 的「制作信息」+ `download.html` + `credits.html` |
| 立绘 | 替换 `assets/art/akineto-stand.webp` / `akineto-alt.webp`（建议透明 PNG/WebP，长宽比约 1:2） |
| 头像 / 站点 logo / favicon | 替换 `akineto-icon.jpg` 后重新生成（见下） |
| 声库规格 | `voicebank.html` 的 `.specs` + `data/voicebank.json` |
| BowlRoll 链接 | 全部页面页脚 + `download.html` + `voicebank.html` + `terms.html` + `news.html` |
| 解压密码 | 同上（目前统一为 `0719`，可全局替换） |
| 试听音频 | 替换 `assets/audio/demo-0X.wav`，并改首页曲名/使用声库说明 |
| 使用条款 | `terms.html`（两个 `.rule` 列表 + 下方 `.prose`） |
| 制作名单 | `credits.html` |

> 页头页脚在 8 个页面里是重复的，改联系方式 / 链接时建议用编辑器「全局替换」。
> 解压密码出现在首页、下载页、声库页、页脚等多处，搜索 `0719` 即可全部改到。

### 重新生成 logo 与 favicon

把新头像保存为 `assets/art/akineto-icon.jpg`，然后：

```bash
python -c "
from PIL import Image, ImageDraw
src = Image.open('assets/art/akineto-icon.jpg').convert('RGB')
w,h = src.size; s = min(w,h)
src = src.crop(((w-s)//2,(h-s)//2,(w+s)//2,(h+s)//2))
m = src.resize((128,128), Image.LANCZOS)
mask = Image.new('L',(128,128),0); ImageDraw.Draw(mask).ellipse((0,0,127,127),fill=255)
m.putalpha(mask); m.save('assets/art/akineto-mark.png')
i = src.resize((256,256), Image.LANCZOS)
m2 = Image.new('L',(256,256),0); ImageDraw.Draw(m2).rounded_rectangle((0,0,255,255),radius=56,fill=255)
i.putalpha(m2); i.save('favicon.ico', sizes=[(16,16),(32,32),(48,48),(64,64)])
src.resize((180,180), Image.LANCZOS).save('assets/icon/apple-touch-icon.png')
"
```

---

## 4. 部署

### GitHub Pages

1. 新建仓库，把 `utau-site` 里的文件放到仓库根目录。
2. `Settings → Pages → Source: Deploy from a branch`，分支 `main`、目录 `/ (root)`。
3. 访问 `https://<用户名>.github.io/<仓库名>/`。

### Netlify / Vercel

把文件夹拖进 Netlify Drop；或在 Vercel 选该目录，Framework 选 `Other`，
Build Command 留空、Output Directory 填 `.`。

站点全部使用相对路径，部署在子目录也能正常工作。

---

## 5. 上线前检查清单

- [ ] 角色资料与立绘确认为最新版本
- [ ] 两个 BowlRoll 链接可正常打开（VCV #363263 / 连单 #358934）
- [ ] 解压密码确认无误（当前 `0719`）
- [ ] 试听音频换成真实 Demo，曲名与「使用声库」说明正确
- [ ] 使用条款按实际情况确认（商用 / 修改 / 二次配布 / R-18）
- [ ] 制作名单确认：声源秋海棠 / 连单原音设定蓝色肥猫
- [ ] OpenUtau 导入路径说明确认（Singers 目录）
- [ ] 公告里的日期与内容按实际更新时间修改
- [ ] 手机实机检查：导航、条款勾选、密码复制、立绘显示
- [ ] 暗色 / 亮色都看一遍
- [ ] OGP 图片（`akineto-icon.jpg`）在分享时能正常显示

---

## 6. 上传到代码仓库

站点目录已经初始化成 Git 仓库，并有一次提交（`Initial commit`），但**还没有配置远程地址**——
当前机器上没有 Git 命令、也没有 GitHub / Gitee 的登录凭据，所以推送需要你这边补一步。

### 方式 A：本地 Git 推送（推荐）

安装 Git 后，在 `utau-site` 目录执行：

```bash
git remote add origin <你的仓库地址>
git branch -M main
git push -u origin main
```

仓库地址形如 `https://gitee.com/<用户名>/<仓库名>.git` 或 `https://github.com/<用户名>/<仓库名>.git`。
第一次推送会要求登录（Gitee 用账号密码或私人令牌，GitHub 用 Personal Access Token）。

### 方式 B：网页上传

仓库里新建项目后，把 `utau-site` 里的**文件**（不是外层文件夹）拖进网页上传，
或先打包成 ZIP 再导入。注意 `index.html` 要放在仓库根目录，不要埋进多层文件夹。

### 关于网络

这台机器访问 `github.com` 超时（`gitee.com` 与 `api.github.com` 正常）。
如果推 GitHub 一直失败，可以改用 Gitee 镜像，或给 Git 配置代理后再推。

---

## 7. 技术说明

- 无外部请求：不加载 Google Fonts、不加载 CDN 脚本，国内网络可直接打开。
- 下载按钮是 **BowlRoll 外链**，勾选条款后才会启用（前端提示，不构成技术强制）。
- 声库同时支持 UTAU 与 OpenUtau：同一份 oto.ini，OpenUtau 放进 `Singers` 目录即可直接读取。
- 首屏立绘用 `object-fit: contain` 显示透明 WebP，不会裁掉裙摆和头部。
- 配色变量在 `:root`：`--c-primary`（青色）、`--c-accent`（蓝紫色），改这两个就能换主色。
- 断点：`880px`（导航折叠、双栏转单栏）、`640px`（字号与间距收紧）。

---

## 8. 版权与免责

- 角色「秋音棠（Akineto）」及立绘版权归原作者所有。
- 「UTAU」是饗庭淵开发的免费歌声合成软件，本站与 UTAU 官方无关。
- `terms.html` 中的使用条款是依据同人声库惯例写的模板，不构成法律意见，正式发布前请按实际情况调整。
