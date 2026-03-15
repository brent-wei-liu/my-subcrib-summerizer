# RSS 订阅摘要器 - 设计文档

## Context
构建一个个人 webapp，定时抓取 RSS 订阅源内容，通过 LLM 总结"大佬们最近在关注什么"。前后端分离架构，OpenAPI 定义接口协议。

## 技术栈

| 层 | 选型 |
|---|---|
| Backend | Python FastAPI (自动生成 OpenAPI spec) |
| Frontend | React + Vite + TypeScript + MUI |
| LLM | Claude API + OpenAI API (可切换) |
| 存储 | JSON 文件 |
| 定时任务 | APScheduler |
| RSS 解析 | feedparser |

## 项目结构

```
my-subcrib-summerizer/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI 入口, CORS, lifespan, 路由挂载
│   │   ├── config.py            # 配置加载
│   │   ├── models.py            # Pydantic 模型 (请求/响应/存储 schema)
│   │   ├── routers/
│   │   │   ├── sources.py       # RSS 源 CRUD
│   │   │   ├── articles.py      # 文章查询 (只读)
│   │   │   ├── summaries.py     # 摘要查询 + 手动触发
│   │   │   ├── scheduler.py     # 调度器状态/配置
│   │   │   └── settings.py      # LLM 配置
│   │   ├── services/
│   │   │   ├── storage.py       # JSON 文件读写 (带线程锁)
│   │   │   ├── crawler.py       # RSS 抓取 + 解析
│   │   │   ├── llm.py           # LLM 抽象层 (Claude + OpenAI)
│   │   │   ├── summarizer.py    # Prompt 构建 + 摘要生成
│   │   │   └── scheduler.py     # APScheduler 封装
│   │   └── data/                # JSON 存储 (gitignored)
│   ├── requirements.txt
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── api/client.ts        # API 请求封装
│   │   ├── pages/
│   │   │   ├── DashboardPage.tsx # 首页: 最新摘要
│   │   │   ├── SourcesPage.tsx   # RSS 源管理
│   │   │   ├── ArticlesPage.tsx  # 文章浏览
│   │   │   ├── SummariesPage.tsx # 摘要列表
│   │   │   └── SettingsPage.tsx  # LLM/调度配置
│   │   ├── components/          # Layout, SourceForm, SummaryCard 等
│   │   ├── hooks/useApi.ts
│   │   ├── types/index.ts
│   │   └── theme.ts
│   ├── vite.config.ts
│   └── package.json
└── .gitignore
```

## API 设计 (所有路径前缀 `/api/v1`)

### Sources `/sources`
- `GET /sources` - 列出所有 RSS 源
- `POST /sources` - 添加源
- `GET /sources/{id}` - 获取单个源
- `PUT /sources/{id}` - 更新源
- `DELETE /sources/{id}` - 删除源

### Articles `/articles` (只读)
- `GET /articles` - 文章列表 (支持 source_id, since, limit, offset 查询参数)
- `GET /articles/{id}` - 单篇文章

### Summaries `/summaries`
- `GET /summaries` - 摘要列表
- `GET /summaries/{id}` - 单个摘要
- `POST /summaries/generate` - 手动触发摘要生成
- `DELETE /summaries/{id}` - 删除摘要

### Crawler `/crawler`
- `POST /crawler/trigger` - 立即抓取所有已启用的源 (仅抓取，不摘要)

### Scheduler `/scheduler`
- `GET /scheduler/status` - 调度器状态 (运行中、下次执行时间、间隔)
- `PUT /scheduler/config` - 更新自动抓取间隔 (调度器只负责抓取，摘要始终手动)

### Settings `/settings`
- `GET /settings` - 获取当前配置
- `PUT /settings` - 更新配置

## 数据模型 (JSON Schema)

### sources.json
```json
[{
  "id": "uuid",
  "name": "Hacker News",
  "url": "https://news.ycombinator.com/rss",
  "category": "tech",
  "enabled": true,
  "created_at": "2026-03-15T10:00:00Z",
  "updated_at": "2026-03-15T10:00:00Z",
  "last_fetched_at": "2026-03-15T12:00:00Z"
}]
```

### articles.json
```json
[{
  "id": "uuid",
  "source_id": "uuid",
  "title": "Article Title",
  "url": "https://example.com/article",
  "author": "Author Name",
  "published_at": "2026-03-15T08:00:00Z",
  "fetched_at": "2026-03-15T12:00:00Z",
  "content_snippet": "前500字...",
  "guid": "RSS唯一标识(用于去重)"
}]
```

### summaries.json
```json
[{
  "id": "uuid",
  "created_at": "2026-03-15T12:05:00Z",
  "period_start": "2026-03-14T12:00:00Z",
  "period_end": "2026-03-15T12:00:00Z",
  "source_ids": ["uuid1", "uuid2"],
  "article_count": 42,
  "llm_provider": "claude",
  "llm_model": "claude-sonnet-4-20250514",
  "content": "## 趋势与主题\n\n### AI/ML...(markdown格式)",
  "prompt_tokens": 8500,
  "completion_tokens": 1200
}]
```

### config.json
```json
{
  "llm": {
    "provider": "claude",
    "model": "claude-sonnet-4-20250514",
    "claude_api_key": "",
    "openai_api_key": "",
    "max_tokens": 2000,
    "temperature": 0.3
  },
  "scheduler": {
    "enabled": true,
    "interval_minutes": 360,
    "max_articles_per_summary": 100
  },
  "crawler": {
    "request_timeout_seconds": 30,
    "max_content_snippet_length": 500
  }
}
```

> API Key 优先从环境变量 (`CLAUDE_API_KEY`, `OPENAI_API_KEY`) 读取，其次从 config.json。

## 核心工作流 (抓取与摘要解耦)

抓取和摘要是**两个独立操作**，用户可分步控制：

### Step 1: 抓取 (Crawl)
```
[定时器触发] 或 [用户点击"立即抓取"]
  → crawl_all_enabled(): 遍历已启用的源，feedparser 解析，去重写入 articles.json
  → 返回新抓取的文章数量
```
用户可以在 Articles 页面预览抓取到的文章内容。

### Step 2: 摘要 (Summarize) — 手动触发
用户预览文章后，手动点击"生成摘要"，支持两种模式：
```
[用户点击"生成摘要"]
  → 选择摘要范围:
    a) "过去N天所有源" — 聚合所有源的文章，跨源分析趋势
    b) "指定源" — 选择一个或多个特定 feed，只总结选中源的文章
  → generate_summary(source_ids?, since?):
    → 按条件筛选文章 → 按源分组构建 prompt
    → 发送到 LLM 跨源/单源分析 → 保存摘要到 summaries.json
```

### Summarize API
`POST /summaries/generate` 接受请求体:
```json
{
  "source_ids": ["uuid1", "uuid2"],  // 可选，为空则包含所有源
  "since_days": 7                     // 可选，默认7天
}
```

### Prompt 设计
- **跨源模式 System**: "你是一个 RSS 订阅分析助手。以下是过去一周来自多个思想领袖/博客的文章。请跨源分析，识别共同关注的主题和趋势，按主题分组总结，重点关注：哪些话题被多人提及、新兴趋势、观点异同。"
- **单源模式 System**: "你是一个 RSS 订阅分析助手。以下是来自 {source_name} 的近期文章。请总结该作者近期关注的主题和趋势。"

### Token 预算管理
发送前估算 token 数 (len/4)，超出模型上下文窗口阈值时截断 snippet 或丢弃旧文章。

## 实现顺序

### Phase 1: 后端骨架
1. 项目初始化 - pyproject.toml, requirements.txt, .gitignore
2. `models.py` - 所有 Pydantic 模型
3. `services/storage.py` - JsonStore 类 (带线程锁)
4. `routers/sources.py` - RSS 源 CRUD
5. `routers/settings.py` - 配置读写

**验证:**
- `uvicorn app.main:app --reload` 启动成功
- 访问 `http://localhost:8000/docs` 看到 Swagger UI，API 文档与 openapi.yaml 一致
- 通过 Swagger UI 执行: POST /sources 创建源 → GET /sources 看到返回 → PUT 更新 → DELETE 删除
- GET /settings 返回默认配置 → PUT /settings 更新后再 GET 验证持久化
- 检查 `backend/app/data/sources.json` 和 `config.json` 文件内容正确

### Phase 2: 爬虫
6. `services/crawler.py` - feedparser 抓取 + 去重
7. `routers/articles.py` - 文章查询接口
8. `routers/crawler.py` - 手动触发抓取接口

**验证:**
- 先通过 POST /sources 添加一个真实 RSS 源 (如 `https://news.ycombinator.com/rss`)
- POST /crawler/trigger → 返回 CrawlResult，`total_new_articles > 0`
- GET /articles 返回抓取到的文章列表，字段完整 (title, url, content_snippet, published_at)
- 再次 POST /crawler/trigger → `total_new_articles` 应为 0 或很少 (去重生效)
- 添加一个无效 URL 的源，触发抓取 → errors 数组中包含该源的错误信息

### Phase 3: LLM + 摘要
9. `services/llm.py` - Claude + OpenAI 客户端抽象
10. `services/summarizer.py` - Prompt 构建 + 摘要生成
11. `routers/summaries.py` - 摘要接口

**验证:**
- PUT /settings 配置一个有效的 LLM API Key
- POST /summaries/generate `{"since_days": 7}` → 返回 Summary，content 为 markdown 格式的趋势分析
- POST /summaries/generate `{"source_ids": ["某个源的id"], "since_days": 7}` → 返回单源摘要
- POST /summaries/generate 无文章时 → 返回 400 错误
- GET /summaries 列出所有摘要 → GET /summaries/{id} 获取单个 → DELETE 删除
- 验证 summaries.json 中 prompt_tokens / completion_tokens 有值

### Phase 4: 调度器
12. `services/scheduler.py` - APScheduler 封装
13. `routers/scheduler.py` - 调度器接口
14. `main.py` - lifespan 中启停调度器

**验证:**
- GET /scheduler/status → 返回 `enabled: true, running: true, next_run_at` 有值
- PUT /scheduler/config `{"interval_minutes": 1}` → 设为 1 分钟
- 等待 1 分钟后 GET /articles → 确认有新文章被自动抓取 (或 last_run_at 更新)
- PUT /scheduler/config `{"enabled": false}` → GET /scheduler/status 确认 `running: false`
- 重启服务器 → GET /scheduler/status 确认调度器根据配置自动恢复

### Phase 5: 前端
15. Vite + React + TS 项目初始化，安装 MUI, react-router, axios, react-markdown
16. Layout + 主题 + 路由
17. API client + TypeScript 类型
18. SourcesPage (用户第一步需要添加 RSS 源)
19. SettingsPage (配置 LLM API Key)
20. DashboardPage + SummariesPage
21. ArticlesPage

**验证:**
- `npm run dev` 启动成功，浏览器打开 `http://localhost:5173`
- 左侧导航栏各页面路由跳转正常
- SourcesPage: 添加/编辑/删除 RSS 源，数据通过 API 持久化
- SettingsPage: 配置 LLM provider 和 API Key，保存后刷新仍在
- Dashboard: 点击"立即抓取"按钮 → 显示抓取结果 → 预览文章
- Dashboard: 点击"生成摘要"→ 选择范围 (全部/指定源) → 显示 markdown 摘要
- SummariesPage: 列出历史摘要，点击查看详情
- ArticlesPage: 文章列表可按源筛选，分页正常

### Phase 6: 收尾
22. Vite dev proxy 配置 (`/api` → backend)
23. 错误处理 (MUI Snackbar)
24. Loading 状态 (MUI Skeleton/CircularProgress)

**验证:**
- 关闭后端 → 前端操作显示友好错误提示 (Snackbar)，不白屏
- 抓取/摘要生成时显示 loading 状态
- 网络慢时 (DevTools throttle) UI 不卡死
