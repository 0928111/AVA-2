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

Windows: 使用你提供的 PocketBase 下载链接

如果你已有 PocketBase 的下载链接（例如发布资产 URL），可以在 PowerShell 中直接下载并解压：

```powershell
# 在项目 backend 目录下运行
cd D:\1-毕业论文\AVA-2\backend
$url = 'https://release-assets.githubusercontent.com/github-production-release-asset/510607652/e0338702-4fb4-41d2-9ab5-9ef3c81526c1?sp=...'
Invoke-WebRequest -Uri $url -OutFile pocketbase_windows.zip
Expand-Archive pocketbase_windows.zip -DestinationPath .
Remove-Item pocketbase_windows.zip
# 解压后会生成 pocketbase.exe（或类似文件名），重命名为 pocketbase.exe 并运行
./pocketbase.exe serve
```

Linux / Docker 部署（推荐用于生产）

我们推荐使用 Docker 来保证开发与生产环境一致。仓库已包含 `Dockerfile.frontend`（用于构建并用 nginx 提供前端）和 `docker-compose.yml`（包含 pocketbase 与前端服务）。示例：

```bash
# 在仓库根目录运行
docker-compose up --build -d
```

这会启动两个容器：
- `pocketbase`：PocketBase 服务，数据目录映射到 `backend/pb_data`。
- `frontend`：前端静态站点，通过 nginx 暴露在 80 端口。

非 Docker（直接在 Linux）部署说明：请参考 `backend/start-pocketbase.sh` 与 `backend/pocketbase.service`（systemd 示例），在服务器上下载适配的 Linux 可执行并保证权限（`chmod +x pocketbase`）。
