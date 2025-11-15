# API调用失败修复指南

## 问题描述
API调用失败，浏览器控制台显示错误：
```
TypeError: Failed to execute 'fetch' on 'Window': Failed to read the 'headers' property from 'RequestInit': String contains non ISO-8859-1 code point
```

## 问题原因
HTTP请求头中包含非ASCII字符（如中文），导致浏览器拒绝发送请求。

## 修复措施

### 1. 代码层面修复（已完成）
- ✅ 在`app/client/api.ts`的`getHeaders()`函数中添加ASCII字符验证
- ✅ 在`app/client/platforms/coze.ts`的`getApiKey()`方法中添加ASCII字符验证
- ✅ 在`app/client/platforms/coze.ts`的`chat()`方法中添加详细的headers日志
- ✅ 在`app/store/access.ts`的`updateToken()`、`updateCode()`、`updateCozeApiKey()`方法中添加ASCII字符验证

### 2. 用户操作步骤

#### 步骤1：清理浏览器本地存储
1. 打开浏览器控制台（F12）
2. 复制`scripts/clear-local-storage.js`文件的内容
3. 在控制台中粘贴并执行
4. 观察清理结果

#### 步骤2：重新配置API密钥
1. 刷新页面
2. 进入设置页面
3. 清空以下输入框中的内容：
   - 访问密码
   - API Key
   - Coze API Key
4. 重新输入正确的ASCII字符（英文、数字、符号）

#### 步骤3：检查环境变量（如适用）
如果使用了`.env.local`文件或部署环境变量，请确保：
```
COZE_API_KEY=your_ascii_only_api_key_here
```

### 3. 验证修复
1. 打开浏览器控制台
2. 发送一条消息
3. 观察控制台日志：
   - 应该看到`[CozeApi] Headers validation:`日志
   - 所有header应该显示为`✓`（ASCII验证通过）
   - 不应出现`✗`标记

## 日志说明
修复后的代码会输出以下日志帮助调试：
- `[AccessStore] Non-ASCII character detected in...` - 存储时发现非ASCII字符
- `[CozeApi] Non-ASCII character detected in API key...` - API密钥包含非ASCII字符
- `[CozeApi] Headers validation:` - 请求头ASCII验证结果

## 注意事项
- 所有API密钥、访问码、token都必须只包含ASCII字符
- 中文字符、特殊符号、表情符号等都会导致请求失败
- ServiceWorker注册失败错误与API问题无关，可忽略

## 服务器状态
当前开发服务器运行在：http://localhost:3001