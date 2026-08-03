# DESIGN: Newsflow

## Project Goal
Newsflow is a personal AI-RSS aggregation and intelligence station. It automates the discovery, processing, and high-fidelity sharing of information through a unified pipeline of AI-enriched summaries and visual card generation.

## Core Architectural Principles
1. **Intelligence Dashboard**: A Vite + React (TS) frontend for browsing and managing processed news.
2. **AI Agent Backend**: A Python-based intelligence layer (`agent-backend/`) that handles discovery and content enrichment.
3. **Autonomous Skill Synthesis**: The system is designed to evolve by adding project-level skills in `agent-backend/skills/`.
4. **DFTD (Design-First, Todo-Driven)**: All project logic (architecture, technical routes, etc.) is anchored in this `DESIGN.md`. It must be the single, up-to-date source of truth.
5. **Auto-Sync**: Scheduled automation (GitHub Actions) for keeping the dashboard data fresh.

## System Components
- **Dashboard (Frontend)**: Modern UI with masonry layout and temporal navigation.
- **Agent CLI (Backend)**: Unified entry point for all operations.
    - `newsflow update <topic>`: Syncs and enriches a specific topic.
    - `newsflow web`: Launches the local dashboard preview server.
    - `newsflow config`: Opens the configuration management interface.
- **Skill Engine**: Domain logic encapsulated in `agent-backend/skills/`.
- **Payloads**: Static JSON and image assets stored in `public/data/`.

## Web Configuration & Task Control
The Dashboard includes a dedicated **Config (配置)** button to allow real-time adjustments and manual execution of update tasks.

**Backend Bridge Architecture (Flask @ Port 8765)**:
- `GET /api/config`: Returns the current `settings.json` and topic-specific JSON configs.
- `POST /api/config`: Validates and saves the updated JSON payloads.
- `GET /api/status`: Returns the agent status and last update time.
- `POST /api/tasks/run`: (New) Triggers background sync tasks (e.g., `{"topic": "energy"}`).

**Interactive Task Control**:
The UI supports "one-click updates" to trigger:
- `Full Sync`: Executes the complete `daily_runner.py` suite.
- `Topic-Specific Sync`: Refreshes only Energy, Tech, or AI Digest.
- `Site Export`: Regenerates the timeline data without new discovery.

## PM2 Process Management
The Newsflow lifecycle is orchestrated via PM2 (`ecosystem.config.js`):
1. **`newsflow-ui`**: The production preview server for the dashboard.
2. **`newsflow-config-server`**: The Flask bridge for UI-Backend communication.
3. **`newsflow-daily-sync`**: A cron-based task (e.g., `0 2 * * *`) that ensures fresh news is ready every morning.

## Strategic Energy Intelligence (Scope Definition)
To avoid information bias, the "Energy & ESG" domain must cover the full spectrum of energy dynamics:
1.  **Energy Security & Geopolitics**: Critical monitoring of geopolitical conflicts (e.g., Middle East, Eastern Europe) and their impact on global energy supply chains, oil/gas prices, and maritime security.
2.  **Energy Transition**: Renewables, hydrogen, BESS, and infrastructure grid impacts.
3.  **Decarbonization & ESG**: CCUS projects, carbon markets (ISSB/CSRD), and climate policy shifts.
4.  **AIDC Power**: Power demand from AI data centers and dedicated low-carbon solutions.

## Information Source Architecture (V1.0)
高质量信息源属于项目的顶层设计，必须通过分层捕获：

| 板块 (Domain) | 核心源 (Primary/Institutional) | 战略源 (Strategic/Market) | 高频信号 (Signal/RSS) |
| :--- | :--- | :--- | :--- |
| **Energy & ESG** | IEA, OPEC, EIA, IRENA | Bloomberg Energy, Reuters Energy, CSIS | Carbon Pulse, CarbonCredits, TradeWinds |
| **AI & Tech** | OpenAI, Anthropic, DeepMind | TechCrunch, Hacker News, YC | LangChain Blog, Simon Willison, TowardsDataScience |
| **Policy & Market** | SEC (ESG), EU Commission (CSRD) | FT Markets, WSJ Energy, Caixin | Carbon Market Watch, IISD |

## Content Expansion & Presentation Upgrade (V1.6)
为解决当前 Newsflow 在内容覆盖面不足、摘要过短、证据感弱的问题，系统升级到统一的内容标准与展示协议。

### 1. Unified Intelligence Content Schema
所有 topic（`Energy`、`Tech`、`AI Digest`）统一输出标准化 intelligence item，而非仅保留短摘要字段。每条 item 至少应包含：

- `title` / `title_zh`
- `url`
- `source` / `source_tier` / `source_kind`
- `published_at`
- `quality_index`
- `short_summary`
- `long_summary`
- `key_quote`
- `supporting_quotes`
- `evidence_snippet`
- `verification_notes`
- `tags`

其中：
- `short_summary` 用于卡片首屏，长度为 2-3 句。
- `long_summary` 用于展开后的完整阅读，长度为 4-8 句，结构固定为“发生了什么 / 为什么重要 / 对谁有影响 / 接下来要看什么”。
- `key_quote` 必须是来自原文的关键原句，作为卡片首屏的证据锚点。
- `supporting_quotes` 为展开区中的 1-2 条补充证据句。

### 2. Mixed Source Pool With Tiering
内容源不再仅依赖少量官方 RSS，而采用“官方源 + builder/blogger + 社区发现源”的混合池，并通过 tier 控制质量与权重：

- `Tier A`: 官方机构、公司博客、研究机构、主流行业媒体。可直接作为高可信发布源。
- `Tier B`: 高质量 builder、独立研究者、工程团队博客。可发布，但需更严格验证与引用约束。
- `Tier C`: 社区聚合、评论入口、发现型 feed。仅用于发现线索，不默认作为高质量发布源。

`Energy` 与 `AI/Tech` 都采用混合型 source pool，但 topic 配置各自维护：
- `Energy`：保留 IEA、EIA、OPEC、IRENA、Reuters Energy、Carbon Pulse 等机构与产业媒体，同时补充高质量能源转型、气候金融、碳市场分析源。
- `AI/Tech`：保留 OpenAI、Anthropic、DeepMind、LangChain、Google 等官方源，并引入高质量 builder/blogger、工程博客、研究博客和社区发现入口，参考 `ai-daily-digest` 与 `follow-builders` 的 source 思路。

### 3. Quote-Aware Summarization Policy
摘要系统从“极简翻译”升级为“结构化编辑摘要 + 原文证据抽取”：

- 模型只能基于已抓取的标题、摘要、正文片段生成摘要与引文。
- 带引号的内容必须直接来自原文，不得意译后伪装成原句。
- 当正文片段不足以支撑引文时，`key_quote` 与 `supporting_quotes` 必须允许留空，不得编造。
- 官方公告类内容优先提取关键事实和机构措辞。
- builder/blogger 类内容优先提取核心观点和代表性原句。
- HN、评论型或仅有导航文本的 feed 若缺少有效正文，必须降权、过滤或拒绝发布。

### 4. Backend Responsibilities
后端需完成以下升级：

- `config/*.json`: 扩充并结构化 source catalog，为 feed 增加 `label`、`tier`、`kind` 等元信息。
- `logic/discovery.py`: 注入 source metadata；清洗 RSS HTML；过滤 HN comments、空摘要、无正文片段条目。
- `logic/enrichment.py`: 输出新 schema；生成双层摘要与引文；保留 verification 结果。
- `logic/publish_site.py`: 导出新字段，同时保持对旧字段的兼容 fallback。

### 5. Frontend Presentation Contract
前端卡片从“单段短摘要”升级为“首屏速览 + 展开深读”：

- 首屏默认显示 `short_summary` 与 `key_quote`。
- 展开后显示 `long_summary` 与 `supporting_quotes`。
- 搜索需要覆盖 `title`、`short_summary`、`long_summary` 与引文字段。
- 若历史数据缺少新字段，前端允许回退到现有 `summary` / `full_translation`，但新生成内容必须优先展示新字段。

### 6. V1.6 Implementation Precision
To ensure the V1.6 upgrade is robust and high-fidelity, the following technical requirements must be met:

#### Frontend UI States & Logic:
- **Loading & Task Feedback**:
    - The `ConfigModal` must display a clear "Update in Progress" state when a task is triggered.
    - Implement a toast or notification system to confirm task completion or report failures.
- **Zero-Data & Empty States**:
    - If a topic returns no items, display a "No signals found for this period" placeholder with a "Refresh" button.
- **Visual Tier Differentiation**:
    - **Tier A (Institutional/Primary)**: Display a small "Verified" or "Primary" badge next to the source.
    - **Tier B (Expert/Builder)**: Standard display with source label.
    - **Tier C (Aggregator/Discovery)**: De-emphasized metadata (lower opacity).
- **Adaptive Card Height**:
    - The masonry layout must handle varied card heights gracefully, as `short_summary` and `key_quote` will increase the vertical footprint.
- **Expanded View Typography**:
    - Use a dedicated serif or highly readable sans-serif for `long_summary` to differentiate it from the "quick scan" short summary.

#### Backend Schema Parsing & Enrichment:
- **Source Metadata Injection**:
    - During discovery, the system must cross-reference the feed URL with the `sources` list in the topic's JSON config to inject `tier` and `kind`.
    - Items from unlisted sources (e.g., discovered via Perplexity/DeepSeek search) should be defaulted to `Tier B` if the URL matches a known high-signal domain, or `Tier C` otherwise.
- **Strict Quote Extraction**:
    - The LLM prompt must include a "Negative Constraint": *DO NOT paraphrase or invent quotes. If no direct, high-signal quote is found in the source text, return an empty string.*
    - If possible, implement a simple substring check in `enrichment.py` to verify that the extracted quote exists within the source snippet.
- **Robust HTML Cleaning**:
    - Before enrichment, all RSS/Atom content must be stripped of HTML tags, script blocks, and style blocks to maximize the LLM's context window and prevent "hallucinating" based on HTML artifacts.

### 7. Acceptance Criteria
本轮升级的完成标准为：

- 每个 topic 都引入新的高质量 source，并能在配置中区分 tier。
- 新生成内容的首屏摘要明显长于当前版本，不再仅为 1-2 句。
- 高质量条目中大部分具备可验证的 `key_quote`。
- 展开后能看到 `long_summary + supporting_quotes`，且信息密度显著提升。
- HN comments、HTML 残留、空洞摘要等低质量内容显著减少。
- 本地导出和前端加载保持兼容，不破坏现有 topic 切换与搜索流程。

## PWA & GitHub Pages Deployment Architecture (V1.7)
为了使 Newsflow 具备原生 App 般的离线阅读体验、快速启动能力，并实现全自动化的云端部署，系统引入 PWA 规范与 GitHub Actions Pages CI/CD。

### 1. PWA Specification & Service Worker Strategy
- **Web App Manifest**:
  - `name`: `Newsflow - Signal Intelligence`
  - `short_name`: `Newsflow`
  - `display`: `standalone` (无浏览器地址栏，全屏原生沉浸体验)
  - `theme_color`: `#0A0A0A` (Obsidian Pro 主题底色)
  - `background_color`: `#0A0A0A`
  - `icons`: 提供 192x192, 512x512, 512x512 maskable, apple-touch-icon 满足跨设备标准。
- **Workbox Caching Policy**:
  - **Static Shell (App Shell)**: `CacheFirst` 缓存 JS、CSS、HTML、SVG 核心资源，实现秒开。
  - **Dynamic News Payloads (`public/data/*.json`)**: `StaleWhileRevalidate` 策略。优先秒开本地缓存数据，后台静默向网络拉取最新情报并就地更新，保证无网可读、有网即新。
  - **Images & Outputs (`public/output/*`)**: `CacheFirst`，最长缓存 30 天，最大条目 100 条。
- **Standalone Mobile Adaptations**:
  - `viewport-fit=cover` 配合 iOS `safe-area-inset-*`，确保刘海屏与底部横条不遮挡内容。

### 2. GitHub Pages CI/CD Workflow
- **Permissions**: `contents: write`, `pages: write`, `id-token: write`.
- **Workflow Pipeline (`newsflow-sync.yml`)**:
  1. `schedule (cron)` 或 `workflow_dispatch` 触发。
  2. Python 管道执行新闻抓取、AI 总结、卡片生成与 payload 导出。
  3. Git commit 并 push 数据更新到 `main` 分支。
  4. Node 20 编译打包 `npm run build` 生成 `dist/`（包含 PWA Service Worker 和 Manifest）。
  5. `actions/upload-pages-artifact` 上传 `dist/` 产物。
  6. `actions/deploy-pages` 自动部署到 GitHub Pages。

### 3. Static Hosting Graceful Fallback (ConfigModal)
- 在 GitHub Pages 静态托管环境下，本地 Flask 桥接服务不可达。
- `ConfigModal` 提供优雅降级状态，友好提示“当前运行在 GitHub Pages 静态只读模式，如需修改配置或手动触发采集，请在本地使用 `./newsflow config`”，避免控制台报错与死循环重试。

## Command Palette & Cockpit Navigation (V1.8)
为提升 Newsflow 的极客体验与操作效率，系统引入 **Cmd+K 全局指令台** 与 **键盘驾驶舱导航 (Cockpit Keyboard Navigation)**。

### 1. Unified Command Palette (`Cmd + K` / `Ctrl + K`)
- **Global Shortcut**: 任意界面下按下 `Cmd+K` (Mac) 或 `Ctrl+K` (Windows/Linux) 或点击顶栏快速呼出。
- **Command Categories**:
  - **Quick Jump (快速跳转)**: 切换 Topics (Energy, Tech, AI Digest, All)。
  - **Global Search (深度搜索)**: 快速检索新闻标题、深度摘要、原句引文与标签，支持回车直接聚焦到对应卡片。
  - **Actions (系统指令)**: 切换明暗主题 (`Toggle Theme`)、切换布局视图 (`Grid / List Mode`)、快速开启配置中心 (`Command Center`)、重置所有筛选器。
  - **Intelligence Feeds (源导航)**: 快速查看与复制核心源。
- **Visual Design**: Obsidian 拟物黑金风格 + 毛玻璃高斯模糊背景 (`backdrop-filter`) + 快捷键指示标签 (`<kbd>`).

### 2. Cockpit Keyboard Navigation
- 在非输入框聚焦状态下，支持键盘单键导航：
  - `j` / `k` 或 `↓` / `↑`：上下聚焦并滚动到前/后一条新闻卡片，卡片呈现高亮聚焦框。
  - `Enter` / `Space`：展开/折叠当前聚焦卡片的深度分析 (`long_summary` 与 `quotes`)。
  - `s`：直接唤起当前聚焦卡片的专属分享与海报生成弹窗。
  - `t`：切换明暗主题 (Light / Dark)。
  - `l`：切换列表 / 网格排列模式。
  - `?`：打开快捷键帮助提示面板。

## Unified Intelligence Station Design System (V2.0 Nexus Edition)
为了彻底解决站点风格零散、缺乏统一设计语言与高质量质感的问题，Newsflow 全面升级至 **Nexus 统一设计系统 (Nexus Design Language)**，确立一以贯之的视觉规范、信息架构与交互动效标准。

### 1. Unified Visual Foundations (设计系统基石)
- **Design Tokens 统一收敛**：
  - **Color Semantics (颜色语义)**:
    - Primary Canvas: `--bg-canvas` (`#07080B` 深空黑底 + 微质感环境光)。
    - Elevated Surface: `--bg-surface-1` (`#0F1117`), `--bg-surface-2` (`#161922`), `--bg-surface-glass` (`rgba(15, 17, 23, 0.75)` + `backdrop-filter: blur(20px)`).
    - Borders: `--border-subtle` (`rgba(255,255,255,0.06)`), `--border-default` (`rgba(255,255,255,0.12)`), `--border-focus` (`#FFD700` 高光金).
    - Typography Colors: `--text-primary` (`#F8FAFC`), `--text-secondary` (`#94A3B8`), `--text-tertiary` (`#64748B`), `--text-accent` (`#FFD700`).
    - Topic Channels:
      - AI & Tech: `--channel-ai` (`#38BDF8` 赛博青 / `#818CF8` 极光紫).
      - Energy & Transition: `--channel-energy` (`#10B981` 翡翠绿 / `#F59E0B` 琥珀金).
      - Strategy & Policy: `--channel-strategy` (`#EC4899` 玫瑰粉 / `#E2E8F0` 纯白).
  - **Typography Hierarchy (字体梯度)**:
    - Display / Headings: `Plus Jakarta Sans`, weights `700/800`, tight letter-spacing (`-0.02em`).
    - Body / Takeaways: `Inter`, weights `400/500`, line-height `1.65`.
    - Code / Metadata / HUD: `JetBrains Mono`, weights `500/600`, letter-spacing `0.05em`.
  - **Spatial Scale & Radii (间距与圆角阶梯)**:
    - Standard Radii: `rounded-xs` (4px), `rounded-sm` (8px), `rounded-md` (12px), `rounded-lg` (16px), `rounded-full` (9999px).
    - Elevation Shadows: 多层弥散光影替代生硬投影，带 1px 亚像素半透明光边。

### 2. Information Architecture: 3-Column Intelligence Station (三栏情报工作台)
为打破单一平铺卡片的单调感，构建专业情报站的层次布局：
1. **Left Navigation Rail (左侧导航总线)**:
   - **Station Brand & Status**: 品牌 Logo、版本号、实时数据更新心跳。
   - **Topic Channels (频道矩阵)**: 带有各频道专属色阶、实时未读/收录计数徽章、快捷切换。
   - **Quality & Signal Filter**: 支持一键筛选 `All Signals`、`Tier A 核心源`、`★ 8.5+ 深度突破`、`⭐ 已收藏 (Bookmarks)`。
   - **Timeline Focus**: 交互式时间能量条。
2. **Center Editorial Stream (中央情报流)**:
   - **Lead Signal Hero (头条核心洞见)**: 每日/当前频道置顶展示最关键的高权重头条，具备大字号社论排版、核心摘要与全景引文。
   - **Card Stream**: 结构严谨、视觉一致的卡片流，支持网格（Grid）与列表（List）一键切换。
3. **Right Intelligence Cockpit (右侧情报洞察抽屉 / HUD)**:
   - **Executive Daily Brief (今日核心趋势速览)**: AI 自动归纳的 3 大行业要点。
   - **Entity & Theme Radar (实体词云雷达)**: 实时高频实体标签（如 `DeepSeek`、`NVIDIA`、`SMR`、`VRAM`、`Grid`），点击直接筛选对应新闻。
   - **Source Distribution (信源矩阵分布)**: 呈现当前信源评级与覆盖健康度。

### 3. Unified Component Archetypes (组件一致性标准)
- **NewsCard 结构标准化**:
  - `Header`: 频道标签 (Channel Pill) + 信源徽章 (Source Tag) + 质量金星 (Quality Badge) + 相对时间 (Relative Time, 如 `2h ago`)。
  - `Title`: 精准排版大标题，Hover 金色高亮。
  - `Takeaway`: 提炼核心结论，关键实体加粗或高亮。
  - `Key Quote`: 统一的大引号左侧微光引用栏。
  - `Action Drawer`: 平滑展开 LLM 深度精读、背景分析与多维佐证。
  - `Footer`: 实体标签、一键收藏 (Bookmark)、生成海报 (Share)、直达原文 (Source ↗)。
- **Unified Modals (统一弹窗基类)**:
  - 所有弹窗（Command Palette、Share Modal、Config Modal、Shortcuts Modal）遵循完全相同的毛玻璃背景、顶栏设计、ESC 关闭指示和操作按钮规范。

## DFTD Mandates
- **Design Anchor**: This `DESIGN.md` is the充分说明文件 and must always be the latest and unique state of the project logic.
- **Integration**: New requirements must be incrementally updated to `DESIGN.md` first, before any code changes.
- **Translation**: Map `DESIGN.md` changes to `TASKS.md` [ ] Todo lists.
- **Execution**: Complete tasks in sequence, ensuring every step matches the `DESIGN.md` definition.
- **Verification**: Compare results with design requirements after task completion to ensure 100% adherence.

## Current State
- Environment: Vite + React (TS) frontend, Python backend, PWA enabled, Cockpit Command Palette integrated, Nexus Design System V2.0 in progress.
- Storage: Local filesystem for drafts and assets, GitHub for static hosting & automated CI/CD.
- Workflow: Transitioning to the DFTD model.

