# Browser Tools MCP - Optimized Version

优化版的浏览器工具，为AI助手提供增强的浏览器监控和截图功能。

## 🚀 主要特性

- **WebSocket实时通信** - 替代轮询机制，提供低延迟的实时数据传输
- **AI自动截图** - 新增 `/api/screenshot` 端点，支持AI控制的自动截图
- **增强日志管理** - 支持日志分类、过滤和限制
- **统一端口配置** - 所有组件统一使用3025端口
- **错误处理优化** - 改进的重试机制和错误恢复
- **API端点标准化** - 清晰的RESTful API设计

## 📋 项目结构

\`\`\`
browser-tools-mcp-optimized/
├── optimized-browser-server.js    # 优化的服务器主文件
├── chrome-extension/               # Chrome扩展
│   ├── manifest.json              # 扩展配置
│   ├── background.js               # 后台服务脚本
│   ├── devtools.html               # 开发者工具页面
│   ├── devtools.js                 # 开发者工具脚本
│   ├── panel.html                  # 面板HTML
│   └── panel.js                    # 面板脚本
├── bin/
│   └── cli.js                      # 命令行接口
├── package.json                    # 项目配置
└── README.md                       # 项目文档
\`\`\`

## 🔧 安装和使用

### 安装依赖
\`\`\`bash
npm install
\`\`\`

### 启动服务器
\`\`\`bash
npm start
# 或直接运行
node optimized-browser-server.js
\`\`\`

### 全局安装
\`\`\`bash
npm install -g .
# 然后可以使用命令
claude-browser-tools
# 或
browser-tools
# 或简短版本
cbt
\`\`\`

## 🌐 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| \`/.identity\` | GET | 服务器身份验证 |
| \`/api/screenshot\` | POST | AI自动截图 |
| \`/api/current-url\` | GET | 获取当前URL |
| \`/api/data\` | GET | 获取所有收集的数据 |
| \`/api/logs\` | GET | 获取日志（支持过滤） |
| \`/api/screenshots\` | GET | 获取截图列表 |
| \`/api/debug\` | GET | 调试信息 |

### AI截图示例
\`\`\`bash
curl -X POST http://localhost:3025/api/screenshot \\
  -H "Content-Type: application/json" \\
  -d '{"filename": "my-screenshot.png"}'
\`\`\`

### 获取过滤日志
\`\`\`bash
curl "http://localhost:3025/api/logs?limit=50&type=console-error"
\`\`\`

## 🔌 Chrome扩展安装

1. 打开Chrome扩展管理页面 (\`chrome://extensions/\`)
2. 启用"开发者模式"
3. 点击"加载已解压的扩展程序"
4. 选择 \`chrome-extension\` 文件夹

## ⚙️ 配置

服务器默认运行在端口3025，这与Chrome扩展的默认配置一致。

### 环境变量
- \`PORT\` - 服务器端口（默认: 3025）

## 🔄 与原版的改进

1. **端口统一** - 修复了原版端口不匹配的问题
2. **WebSocket支持** - 添加实时通信能力
3. **AI截图功能** - 新增AI控制的截图API
4. **错误处理** - 改进的重试和恢复机制
5. **日志管理** - 更好的日志分类和过滤
6. **API标准化** - 清晰的REST API设计

## 🔐 安全说明

⚠️ **注意**: Chrome扩展目前请求所有URL权限(\`<all_urls>\`)，这可能存在安全风险。建议在生产环境中限制权限范围。

## 🛠️ 开发

### 运行测试
\`\`\`bash
npm test
\`\`\`

### 代码结构
- 使用ES6模块化设计
- WebSocket + HTTP双协议支持
- 错误处理和重试机制
- 内存管理和性能优化

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Pull Request 和 Issue！

---

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>