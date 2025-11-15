# 🎯 VisualCodeChat - AI编程导师

一个基于AI的智能编程学习平台，支持算法可视化、代码解释和个性化编程辅导。

## 🚀 快速开始（仅需两步）

### 第一步：配置API
```bash
npm run setup
# 按提示输入OpenAI API密钥即可
```

### 第二步：启动应用
```bash
npm run dev
# 访问 http://localhost:3000
```

## 📋 详细说明

### 获取OpenAI API密钥
1. 访问 [OpenAI Platform](https://platform.openai.com/)
2. 注册/登录账户
3. 进入"API Keys"页面创建新密钥

### 手动配置（可选）
```bash
cp .env.template .env.local
# 编辑.env.local，填入OPENAI_API_KEY
```

## ✨ 核心功能

- 🔍 **算法可视化**：动态展示算法执行过程
- 💡 **代码解释**：智能解释代码逻辑和原理
- 🎓 **个性化学习**：根据编程水平调整解释难度
- 🌐 **多语言支持**：支持Python、JavaScript、C++等
- 📝 **实时交互**：即时答疑和代码分析
- 🎨 **美观界面**：现代化的用户体验

## 🛠️ 技术栈

- **前端**：Next.js 14, React 18, TypeScript
- **UI**：Tailwind CSS, Framer Motion
- **状态管理**：Zustand
- **AI集成**：OpenAI GPT-4 API
- **可视化**：D3.js, Mermaid
- **部署**：Vercel

## 🔧 高级配置

### 环境变量
```env
# 必需
OPENAI_API_KEY=sk-your-key

# 可选
CODE=your-access-code          # 访问密码
PROXY_URL=http://localhost:7890 # 代理设置
BASE_URL=https://api.openai.com # API地址
DISABLE_GPT4=no                 # 禁用GPT-4
```

### 多模型支持
支持OpenAI、Coze等多种AI模型，在配置文件中设置即可。

## 📖 文档

- [快速开始指南](QUICK-START.md)
- [API配置详解](README-API-SETUP.md)
- [开发文档](docs/DEVELOPMENT.md)

## 🤝 贡献

欢迎提交Issue和Pull Request！请查看[贡献指南](CONTRIBUTING.md)。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件。

## 🆘 支持

- 📧 邮箱：support@visualcodechat.com
- 💬 讨论区：[GitHub Discussions](https://github.com/your-username/visualcodechat/discussions)
- 🐛 问题报告：[GitHub Issues](https://github.com/your-username/visualcodechat/issues)

---

⭐ 如果这个项目对你有帮助，请给个Star！