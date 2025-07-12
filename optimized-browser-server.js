const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

class OptimizedBrowserToolsServer {
  constructor(port = 3025) {
    this.port = port;
    this.logs = [];
    this.networkRequests = [];
    this.currentUrl = '';
    this.server = null;
    this.wss = null;
    this.connectedClients = new Set();
    this.requestCounter = 0;
    
    // 确保截图目录存在
    this.screenshotDir = path.join(__dirname, 'screenshots');
    if (!fs.existsSync(this.screenshotDir)) {
      fs.mkdirSync(this.screenshotDir, { recursive: true });
    }
  }

  start() {
    this.server = http.createServer((req, res) => {
      // 设置CORS头
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://localhost:${this.port}`);
      console.log(`${new Date().toISOString()} - ${req.method} ${url.pathname}`);

      // 服务器身份验证端点
      if (url.pathname === '/.identity' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          signature: 'mcp-browser-connector-24x7',
          name: 'Optimized Browser Tools Server',
          version: '2.0.0',
          port: this.port.toString(),
          features: ['auto-screenshot', 'real-time-logs', 'ai-control']
        }));
        return;
      }

      // AI自动截图端点 - 这是关键改进！
      if (url.pathname === '/api/screenshot' && req.method === 'POST') {
        this.handleAutoScreenshot(req, res);
        return;
      }

      // 获取当前URL端点
      if (url.pathname === '/api/current-url' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          url: this.currentUrl,
          timestamp: new Date().toISOString()
        }));
        return;
      }

      // 接收URL更新
      if (url.pathname === '/current-url' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            this.currentUrl = data.url;
            console.log(`🌐 URL更新: ${data.url} (标签页: ${data.tabId})`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, message: 'URL updated' }));
          } catch (error) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
        return;
      }

      // 接收截图（从扩展来的）
      if (url.pathname === '/screenshot' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // 处理文件路径：总是在screenshots目录中生成文件
            let filename;
            let filepath;
            if (data.path) {
              // 如果提供了路径，检查是否是目录
              if (fs.existsSync(data.path) && fs.statSync(data.path).isDirectory()) {
                // 如果是目录，在该目录中生成文件名
                filename = `screenshot-${timestamp}.png`;
                filepath = path.join(data.path, filename);
              } else {
                // 如果是文件名或不存在的路径，提取文件名
                filename = path.basename(data.path);
                // 如果没有扩展名，添加.png
                if (!path.extname(filename)) {
                  filename += '.png';
                }
                filepath = path.join(this.screenshotDir, filename);
              }
            } else {
              // 没有提供路径，使用默认文件名
              filename = `screenshot-${timestamp}.png`;
              filepath = path.join(this.screenshotDir, filename);
            }

            // 保存base64图片数据
            const base64Data = data.data.replace(/^data:image\/png;base64,/, '');
            fs.writeFileSync(filepath, base64Data, 'base64');
            
            console.log(`📸 截图已保存: ${filepath}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              path: filepath,
              message: 'Screenshot saved successfully'
            }));
          } catch (error) {
            console.error('❌ 保存截图失败:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
        return;
      }

      // 清除日志
      if (url.pathname === '/wipelogs' && req.method === 'POST') {
        this.logs = [];
        this.networkRequests = [];
        console.log('🧹 所有日志已清除');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: 'All logs wiped successfully' 
        }));
        return;
      }

      // 获取收集的数据
      if (url.pathname === '/api/data' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            currentUrl: this.currentUrl,
            logs: this.logs.slice(-50), // 最近50条日志
            networkRequests: this.networkRequests.slice(-50), // 最近50条网络请求
            connectedClients: this.connectedClients.size,
            totalLogs: this.logs.length,
            totalNetworkRequests: this.networkRequests.length,
            timestamp: new Date().toISOString()
          }
        }));
        return;
      }

      // 专门的日志查看端点
      if (url.pathname === '/api/logs' && req.method === 'GET') {
        const limit = parseInt(url.searchParams.get('limit')) || 100;
        const type = url.searchParams.get('type'); // console-log, console-error, network-request
        
        let filteredLogs = this.logs;
        if (type) {
          filteredLogs = this.logs.filter(log => log.type === type);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          logs: filteredLogs.slice(-limit),
          total: filteredLogs.length,
          filters: { type, limit }
        }));
        return;
      }

      // 获取截图列表
      if (url.pathname === '/api/screenshots' && req.method === 'GET') {
        try {
          const screenshots = fs.readdirSync(this.screenshotDir)
            .filter(file => file.endsWith('.png'))
            .map(file => ({
              filename: file,
              path: path.join(this.screenshotDir, file),
              created: fs.statSync(path.join(this.screenshotDir, file)).ctime
            }))
            .sort((a, b) => b.created - a.created); // 按时间倒序

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            screenshots: screenshots
          }));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
        return;
      }

      // 接收控制台日志
      if (url.pathname === '/extension-log' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            const logData = payload.data;
            
            console.log(`📝 收到扩展日志:`, logData); // 增强调试输出
            
            this.logs.push({
              ...logData,
              timestamp: new Date().toISOString(),
              receivedAt: Date.now()
            });
            
            // 同时记录网络请求
            if (logData.type === 'network-request') {
              this.networkRequests.push({
                ...logData,
                timestamp: new Date().toISOString()
              });
            }
            
            // 保持日志数量在合理范围内
            if (this.logs.length > 1000) {
              this.logs = this.logs.slice(-500);
            }
            
            console.log(`📊 当前日志总数: ${this.logs.length}, 网络请求: ${this.networkRequests.length}`);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, logCount: this.logs.length }));
          } catch (error) {
            console.error('❌ 处理扩展日志失败:', error);
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: error.message }));
          }
        });
        return;
      }

      // 调试端点 - 检查服务器状态
      if (url.pathname === '/api/debug' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          debug: {
            serverPort: this.port,
            connectedClients: this.connectedClients.size,
            logsCount: this.logs.length,
            networkRequestsCount: this.networkRequests.length,
            currentUrl: this.currentUrl,
            uptime: process.uptime(),
            endpoints: [
              'GET /.identity',
              'POST /api/screenshot',
              'GET /api/data',
              'GET /api/logs?limit=100&type=console-log',
              'GET /api/screenshots',
              'GET /api/debug',
              'POST /extension-log',
              'POST /screenshot',
              'POST /current-url'
            ]
          }
        }));
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    // 设置WebSocket服务器
    this.wss = new WebSocket.Server({ server: this.server, path: '/extension-ws' });
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 Chrome扩展已连接 WebSocket');
      this.connectedClients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log('📨 收到WebSocket消息:', data.type);
          
          // 处理心跳
          if (data.type === 'heartbeat') {
            ws.send(JSON.stringify({ type: 'heartbeat-response' }));
            return;
          }

          // 处理页面导航
          if (data.type === 'page-navigated') {
            this.currentUrl = data.url;
            console.log(`🌐 页面导航: ${data.url}`);
          }

          // 处理截图响应
          if (data.type === 'screenshot-data') {
            this.handleScreenshotData(data);
          }

        } catch (error) {
          console.error('❌ WebSocket消息处理错误:', error);
        }
      });

      ws.on('close', () => {
        console.log('🔌 Chrome扩展断开 WebSocket');
        this.connectedClients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket错误:', error);
        this.connectedClients.delete(ws);
      });
    });

    this.server.listen(this.port, '0.0.0.0', () => {
      console.log(`🚀 优化版 Browser Tools Server 启动成功！`);
      console.log(`📍 监听地址: http://localhost:${this.port}`);
      console.log(`🔧 身份端点: http://localhost:${this.port}/.identity`);
      console.log(`📊 数据查看: http://localhost:${this.port}/api/data`);
      console.log(`📸 AI截图: http://localhost:${this.port}/api/screenshot`);
      console.log(`🖼️  截图列表: http://localhost:${this.port}/api/screenshots`);
    });
  }

  // 关键功能：AI自动截图
  handleAutoScreenshot(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const options = body ? JSON.parse(body) : {};
        const requestId = ++this.requestCounter;
        
        console.log(`📸 AI请求自动截图 (请求ID: ${requestId})`);

        if (this.connectedClients.size === 0) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: false,
            error: 'No Chrome extension connected'
          }));
          return;
        }

        // 向所有连接的扩展发送截图命令
        const screenshotCommand = {
          type: 'take-screenshot',
          requestId: requestId,
          timestamp: Date.now(),
          ...options
        };

        let responseTimeout;
        let responded = false;

        // 设置响应超时
        responseTimeout = setTimeout(() => {
          if (!responded) {
            responded = true;
            res.writeHead(408, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              success: false,
              error: 'Screenshot request timeout'
            }));
          }
        }, 10000); // 10秒超时

        // 临时监听截图响应
        const responseHandler = (ws) => {
          const messageHandler = (message) => {
            try {
              const data = JSON.parse(message);
              if (data.type === 'screenshot-data' && data.requestId === requestId) {
                if (!responded) {
                  responded = true;
                  clearTimeout(responseTimeout);
                  
                  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                  const filename = options.filename || `ai-screenshot-${timestamp}.png`;
                  const filepath = path.join(this.screenshotDir, filename);

                  // 保存截图
                  const base64Data = data.data.replace(/^data:image\/png;base64,/, '');
                  fs.writeFileSync(filepath, base64Data, 'base64');
                  
                  console.log(`✅ AI自动截图保存成功: ${filepath}`);
                  
                  res.writeHead(200, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({
                    success: true,
                    path: filepath,
                    filename: filename,
                    message: 'AI screenshot captured successfully'
                  }));
                }
                
                // 移除监听器
                ws.off('message', messageHandler);
              }
            } catch (error) {
              console.error('❌ 处理截图响应错误:', error);
            }
          };

          ws.on('message', messageHandler);
        };

        // 发送截图命令到所有连接的客户端
        this.connectedClients.forEach(ws => {
          if (ws.readyState === WebSocket.OPEN) {
            responseHandler(ws);
            ws.send(JSON.stringify(screenshotCommand));
          }
        });

      } catch (error) {
        console.error('❌ 处理AI截图请求失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
  }

  // 处理截图数据（从扩展接收）
  handleScreenshotData(data) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = data.path || `extension-screenshot-${timestamp}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      // 保存截图
      const base64Data = data.data.replace(/^data:image\/png;base64,/, '');
      fs.writeFileSync(filepath, base64Data, 'base64');
      
      console.log(`📸 扩展截图已保存: ${filepath}`);
    } catch (error) {
      console.error('❌ 保存扩展截图失败:', error);
    }
  }

  stop() {
    if (this.wss) {
      this.wss.close();
    }
    if (this.server) {
      this.server.close();
      console.log('🛑 优化版 Browser Tools Server 已停止');
    }
  }
}

// 只有在直接运行这个文件时才启动服务器
if (require.main === module) {
  const server = new OptimizedBrowserToolsServer(3025);
  server.start();
}

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});

module.exports = OptimizedBrowserToolsServer;