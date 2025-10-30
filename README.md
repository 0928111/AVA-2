# AVA-2 — 算法可视化教学网站

项目骨架：前端使用 Vite + React + TypeScript，后端使用 PocketBase 作为轻量级开发/测试后端（不包含托管二进制）。

结构概览

- `frontend/` — 前端源码（Vite + React + TS）
- `backend/` — PocketBase 启动脚本和 Collections 示例说明

快速开始（Windows PowerShell）

1. 安装 Node.js（建议 18+）
2. 进入前端目录并安装依赖：

```powershell
cd frontend
npm install
npm run dev
```

3. 启动 PocketBase（参考 `backend/start-pocketbase.ps1`）：

```powershell
cd ..\backend
./start-pocketbase.ps1
```

推送到 GitHub

本项目已配置为可推送到你的仓库 `https://github.com/0928111/AVA-2.git`。如果 push 失败，请确保本机已配置 GitHub 认证（SSH key 或 GitHub CLI 登录）。

接下来的工作建议

- 实现具体算法可视化组件（PageRank、Dijkstra、树遍历等）
- 添加 PocketBase Collections（users、learning_records、questions 等）
- 增加 CI（可选：GitHub Actions）与 Docker 化部署
