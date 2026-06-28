# FinPilot Front

FinPilot 的前端应用，基于 Vue 3 + Element Plus + Vite 构建。

后端仓库：[FinPilot](https://github.com/EricSu-Dev/FinPilot.git)（FastAPI · LangGraph · DeepSeek）

- 在线地址：[finpilot.nexmart.tech](https://finpilot.nexmart.tech/)
- 本地开发时，前端通过 Vite 代理 + CORS 连接本地后端（默认 `http://localhost:8094`）
- 生产部署时，前端 `npm run build` 后静态文件挂到后端同域，API 请求走同源 `/api/*`，无需跨域

## 技术栈

Vue 3 · Element Plus · Vue Router · Axios · Marked · Vite

## 页面

| 页面 | 路由 | 说明 |
|------|------|------|
| AI 对话首页 | `/` | 流式对话，股票/基金/持仓/市场热点一站式入口 |
| 诊断页 | `/diagnosis` | 股票/基金多维度深度诊断 |
| 持仓管理 | `/portfolio` | 持仓 CRUD + 实时盈亏 |
| 登录 | `/login` | JWT 登录 |

## 本地开发

```bash
npm install
npm run dev
```

默认运行在 `http://localhost:8093`。

## 构建

```bash
npm run build
```

产出在 `dist/` 目录。
