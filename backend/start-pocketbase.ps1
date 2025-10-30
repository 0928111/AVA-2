<#
Start PocketBase (开发用) — Windows PowerShell 脚本

说明：脚本不会自动下载 PocketBase 二进制；请手动从 https://pocketbase.io/ 下载对应平台的可执行文件并放到本目录下，命名为 `pocketbase.exe`（Windows）或 `pocketbase`（Linux/Mac）。

用法：在 PowerShell 中运行：

    ./start-pocketbase.ps1

默认会以当前目录下的 `pocketbase.exe` 启动，并使用默认端口 8090。
#>

$pbPathWindows = Join-Path -Path $PSScriptRoot -ChildPath "pocketbase.exe"
$pbPathUnix = Join-Path -Path $PSScriptRoot -ChildPath "pocketbase"

if (Test-Path $pbPathWindows) {
    Write-Host "启动 PocketBase (Windows) ..." -ForegroundColor Green
    & $pbPathWindows "serve"
} elseif (Test-Path $pbPathUnix) {
    Write-Host "启动 PocketBase (Unix) ..." -ForegroundColor Green
    & $pbPathUnix "serve"
} else {
    Write-Host "未找到 pocketbase 可执行文件。请从 https://pocketbase.io/ 下载并放到 backend 目录下，并命名为 pocketbase.exe 或 pocketbase。" -ForegroundColor Yellow
}
