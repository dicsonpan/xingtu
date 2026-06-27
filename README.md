# 知遇 — 中考偏科生职教志愿填报助手

> TRAE AI 创造力大赛 · 社会服务赛道作品

为中考成绩后 20% 的偏科生提供**天赋发掘测评 → 专业智能匹配 → 学校推荐对比 → 防骗预警**的全流程 AI 服务。

## 技术栈

- **前端**: React 18 + TypeScript + Vite + React Router v6
- **后端**: Cloudflare Pages Functions (Hono)
- **数据库**: Cloudflare D1 (SQLite)
- **AI**: Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`)

## 项目结构

```
zhiyu/
├── src/                          # React 前端
│   ├── api/client.ts             # API 客户端
│   ├── context/AuthContext.tsx   # 认证上下文
│   ├── components/               # 导航栏、页脚
│   ├── pages/                    # 落地页、注册、登录、Dashboard、Admin
│   │   └── dashboard/            # 总览、档案、测评、匹配、学校、防骗、改密
│   ├── App.tsx                   # 路由入口
│   ├── main.tsx
│   └── index.css                 # 全局样式系统
├── functions/                    # Cloudflare Pages Functions (API)
│   ├── api/[[path]].ts           # Hono 入口
│   ├── _lib/                     # 认证、数据库、AI 辅助
│   └── _routes/                  # 路由: auth/profile/assessment/matching/school/antifraud/admin
├── shared/types.ts               # 前后端共享类型
├── schema.sql                    # D1 数据库建表脚本
├── wrangler.toml                 # Cloudflare 配置
└── package.json
```

## 部署步骤

### 1. 创建 Cloudflare D1 数据库

```bash
npx wrangler d1 create xingtu-db
```

将返回的 `database_id` 填入 `wrangler.toml` 中的 `database_id` 字段。

### 2. 初始化数据库

```bash
# 本地
npx wrangler d1 execute DB --local --file=schema.sql

# 远程（生产环境）
npx wrangler d1 execute DB --file=schema.sql
```

### 3. 配置密钥

编辑 `wrangler.toml`，修改以下值：
- `JWT_SECRET`: 改为一个随机长字符串（用于 JWT 签名）
- `ADMIN_INIT_KEY`: 改为您自己的管理员初始化密钥

或使用 Cloudflare Secrets（推荐生产环境）：
```bash
npx wrangler pages secret put JWT_SECRET
npx wrangler pages secret put ADMIN_INIT_KEY
```

### 4. 本地开发

```bash
npm install
npm run dev              # 启动前端 (localhost:5173)
# 另一个终端：
npx wrangler pages dev . --d1 DB --ai   # 启动后端 (localhost:8788)
```

### 5. 部署到 Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy dist
```

或连接 GitHub 仓库自动部署（在 Cloudflare Dashboard 中设置）。

### 6. 初始化管理员账号

部署后，访问 `/login` 页面，点击底部的"管理员初始化"链接，输入：
- 管理员密钥（你在 `wrangler.toml` 或 Secrets 中设置的 `ADMIN_INIT_KEY`）
- 用户名、邮箱、密码

创建后即可使用管理员账号登录后台审核用户。

## 使用流程

1. **用户注册**: 填写用户名、邮箱、密码和申请理由
2. **管理员审核**: 管理员在后台审核注册申请，通过后用户才能使用
3. **完善档案**: 填写个人基础信息、中考成绩、兴趣偏好、天赋自评
4. **天赋测评**: AI 分析 8 大天赋维度，生成天赋画像
5. **专业匹配**: 基于天赋+兴趣+成绩，AI 推荐适合的职业教育专业
6. **学校对比**: 根据目标专业，AI 推荐并对比学校类型
7. **防骗检测**: 输入学校名称或招生信息，AI 识别诈骗风险

## 数据库表

| 表名 | 说明 |
|------|------|
| `users` | 用户账号（含审核状态、角色、申请理由） |
| `user_profiles` | 用户档案（基础信息、中考成绩、天赋自评、兴趣偏好） |
| `usage_logs` | AI 使用记录（功能类型、token 消耗，不含隐私信息） |
| `assessments` | 天赋测评记录（答案 + AI 天赋画像） |
| `conversations` | 对话记录 |
| `fraud_checks` | 防骗检测记录 |

## 管理后台功能

- 用户审核（通过/拒绝/封禁/解封）
- 用户使用统计查看（token 消耗、请求次数，不含隐私信息）
- 全局统计面板（总用户数、待审核数、token 总量、功能使用分布）
