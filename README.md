# Mineradio

<p align="center">
  <img src="./docs/assets/readme/cinema-beat-smoke.png" alt="Mineradio preview" width="860">
</p>

<p align="center">
  <strong>一款面向 Windows 的沉浸式桌面音乐播放器。</strong>
</p>

<p align="center">
  <a href="https://github.com/forsisi/Mineradio/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/forsisi/Mineradio?include_prereleases&style=flat-square"></a>
  <a href="./LICENSE"><img alt="License" src="https://img.shields.io/badge/license-GPL--3.0-blue?style=flat-square"></a>
  <img alt="Platform" src="https://img.shields.io/badge/platform-Windows-0078D4?style=flat-square">
  <img alt="Electron" src="https://img.shields.io/badge/Electron-42.x-47848F?style=flat-square">
  <img alt="Node" src="https://img.shields.io/badge/Node.js-local%20server-339933?style=flat-square">
</p>

Mineradio 基于 Electron、Node.js、Three.js、GSAP、WebAudio 与多音乐源接口构建，融合跨平台音乐搜索播放、账号歌单同步、桌面歌词、天气电台、粒子视觉、3D 歌单架和 GitHub 自动更新，为 Windows 桌面提供更有现场感的私人音乐空间。

本仓库当前由 **BuBu** 维护与二次开发，更新源和发布入口已切换到 `forsisi/Mineradio`。

当前版本：`v1.1.2`

## 项目亮点

- **多音乐源聚合**：接入网易云音乐、QQ 音乐、酷狗概念版搜索、登录态、歌单、歌词、收藏和播放链路。
- **沉浸式播放体验**：歌词舞台、桌面歌词、封面粒子、电影镜头和节奏分析共同驱动播放视觉。
- **3D 歌单架**：右键唤起 3D 歌单浏览，支持歌单详情、中心高亮、滚轮选择音和常驻/静态模式。
- **天气电台**：基于 Open-Meteo 和定位信息生成天气 mood，联动首页推荐与电台队列。
- **DIY 视觉控制台**：支持粒子密度、颜色、歌词位置、3D 歌单架参数、性能档位和用户视觉存档。
- **桌面级分发**：支持 Windows NSIS 安装包、GitHub Releases 更新检测、镜像下载、校验和补丁备份。

## 视觉预览

| 播放视觉 | 适合场景 |
| --- | --- |
| Emily / 默认视觉 | 日常播放、歌词舞台、封面粒子联动 |
| 安魂点云 | 低角度 3D 点云、强氛围歌曲 |
| 星河首页 | 未播放状态、天气电台、首页浏览 |
| 3D 歌单架 | 歌单浏览、队列切换、沉浸式选歌 |

## 技术栈

| 层级 | 技术 |
| --- | --- |
| 桌面端 | Electron, Chromium, IPC, NSIS installer |
| 本地服务 | Node.js, native `http/https`, local API server |
| 前端界面 | HTML, CSS, Vanilla JavaScript, Three.js, GSAP |
| 音频与视觉 | WebAudio, custom beat analysis, particle systems, 3D lyrics |
| 音乐源 | NeteaseCloudMusicApi, QQ Music web endpoints, KuGou concept endpoints |
| 天气与更新 | Open-Meteo, GitHub Releases, mirror fallback, SHA digest validation |

## 功能地图

- 搜索、播放、播放队列、歌词解析、桌面歌词窗口
- 网易云/QQ/酷狗账号登录态同步和歌单读取
- 红心/收藏、歌单创建、歌单歌曲添加和收藏同步
- 每日推荐、私人电台、天气电台、继续听、听歌画像
- 自定义封面上传裁剪、自定义歌词、自定义视觉存档
- 电影镜头、粒子预设、节奏分析、播客/DJ 长音频视觉优化
- 3D 歌单架、歌单详情页、滚轮高亮、选择音和动态/静态镜头
- 后台性能策略、画质档位、最小化低占用、直播后台保持
- GitHub Release 检测、安装包下载、镜像线路、补丁包校验与回滚备份

## 快速开始

### 安装

Windows 用户优先下载 Release 中的安装包：

- [GitHub Releases](https://github.com/forsisi/Mineradio/releases/latest)
- 安装包文件名通常为 `Mineradio-x.y.z-Setup.exe`

不要把 `Source code`、`.blockmap`、`latest.yml` 或 `win-unpacked` 当作正式安装包。

### 本地开发

```bash
npm install
npm start
```

### 构建

```bash
npm run build:win:dir
npm run build:win
```

构建产物位于 `dist/`，正式 Windows 安装包由 `electron-builder` 和 `build/installer.nsh` 生成。

## 项目结构

```text
Mineradio/
├─ desktop/             # Electron main/preload, desktop lyrics, wallpaper window
├─ public/              # Main UI, visual system, lyrics, 3D playlist shelf
│  ├─ assets/           # Runtime visual assets
│  └─ vendor/           # Local frontend dependencies
├─ build/               # Icon, NSIS installer resources and packaging hooks
├─ docs/                # Project memory, release notes, visual implementation notes
├─ scripts/             # Provider verification scripts
├─ server.js            # Local API server, music providers, update and patch logic
├─ dj-analyzer.js       # Beat and long-audio analysis utilities
├─ package.json         # App metadata, scripts and electron-builder config
└─ CHANGELOG.md         # Release history
```

## 本地配置

Mineradio 会把用户状态保存在本机。常见本地文件包括：

- `.cookie`
- `.qq-cookie`
- `.kugou-cookie`
- `updates/`
- beat cache and Electron user data

这些文件已加入忽略规则，不应该提交到仓库。

本地测试更新链路时，可以把 `MINERADIO_UPDATE_MANIFEST` 指向本地 JSON 文件或 HTTP 地址。

## 质量检查

```bash
git diff --check
node --check server.js
```

前端主逻辑集中在 `public/index.html`，涉及视觉和交互的改动建议在 Electron 实机窗口中检查。

## 隐私与第三方服务

Mineradio 不是网易云音乐、QQ 音乐、酷狗或腾讯音乐娱乐集团的官方客户端。

第三方平台接入仅用于个人学习、本地客户端实验和用户自有账号会话下的播放体验。请遵守各平台用户协议、版权规则和会员权益规则。Mineradio 不提供绕过付费、破解会员或重新分发音乐内容的能力。

更多说明见 [PRIVACY.md](./PRIVACY.md)。

## 路线规划

- 抽象 Provider 层，让多音乐源扩展更清晰
- 继续完善酷狗概念版账号、歌单和收藏工作流
- 强化发布自动化、安装包校验和安全扫描
- 在现有视觉稳定后推进壁纸/桌面融合模式
- 为重 3D 和粒子场景补充更系统的性能分析

## 维护者与致谢

当前由 **BuBu** 维护与二次开发。

本项目是基于上游开源工作的 GPL-3.0 桌面音乐播放器 fork/rebuild。感谢原项目作者、早期体验者和反馈者对播放体验与视觉方向的帮助。

## 开源协议

本项目采用 [GPL-3.0](./LICENSE) 协议。

MR Logo、Mineradio 名称、界面视觉设计与原创视觉表达归各自创作者所有；第三方依赖和第三方服务遵循各自授权与服务条款。
