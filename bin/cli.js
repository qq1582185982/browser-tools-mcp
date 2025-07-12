#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

// 获取包的根目录
const packageDir = path.dirname(__dirname);
const OptimizedBrowserToolsServer = require(path.join(packageDir, 'optimized-browser-server.js'));

// 解析命令行参数
const args = process.argv.slice(2);
const command = args[0] || 'start';

function showHelp() {
  console.log(`
🌟 Claude Browser Tools v2.0.0 - Enhanced Browser Tools for AI Assistants

用法:
  claude-browser-tools [command] [options]
  browser-tools [command] [options]  
  cbt [command] [options]

命令:
  start [port]     启动优化版Browser Tools服务器 (默认端口: 3026)
  test             测试AI自动截图功能
  screenshot       立即截图
  logs             查看服务器日志
  debug            显示调试信息
  help, -h, --help 显示此帮助信息

选项:
  --port, -p       指定服务器端口 (默认: 3026)
  --host           指定服务器主机 (默认: localhost)
  --quiet, -q      静默模式，减少输出

示例:
  claude-browser-tools start           # 启动服务器在默认端口3026
  claude-browser-tools start 3030     # 启动服务器在端口3030
  claude-browser-tools test           # 测试截图功能
  claude-browser-tools screenshot     # 立即截图
  cbt start --port 3030               # 简短命令启动

🚀 功能特性:
  ✨ AI自动截图 - POST http://localhost:3026/api/screenshot
  📊 实时日志API - GET http://localhost:3026/api/logs
  🖼️  截图管理 - GET http://localhost:3026/api/screenshots
  🔧 服务器调试 - GET http://localhost:3026/api/debug

📖 文档: http://localhost:3026 (服务器启动后访问)
  `);
}

function parseArgs() {
  const options = {
    port: 3026,
    host: 'localhost',
    quiet: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--port':
      case '-p':
        options.port = parseInt(args[++i]) || 3026;
        break;
      case '--host':
        options.host = args[++i] || 'localhost';
        break;
      case '--quiet':
      case '-q':
        options.quiet = true;
        break;
    }
  }

  return options;
}

async function startServer() {
  const options = parseArgs();
  const port = args[1] ? parseInt(args[1]) : options.port;

  if (!options.quiet) {
    console.log('🚀 启动 Claude Browser Tools 服务器...');
    console.log('✨ 增强功能: AI自动截图、实时日志、WebSocket通信');
    console.log('');
  }

  try {
    const server = new OptimizedBrowserToolsServer(port);
    server.start();

    if (!options.quiet) {
      console.log('');
      console.log('🎯 API端点:');
      console.log(`   POST http://localhost:${port}/api/screenshot  - AI自动截图`);
      console.log(`   GET  http://localhost:${port}/api/logs        - 查看日志`);
      console.log(`   GET  http://localhost:${port}/api/debug       - 调试信息`);
      console.log(`   GET  http://localhost:${port}/api/screenshots - 截图列表`);
      console.log('');
      console.log('⏹️  按 Ctrl+C 停止服务器');
    }
  } catch (error) {
    console.error('❌ 启动服务器失败:', error.message);
    process.exit(1);
  }
}

async function testScreenshot() {
  console.log('📸 测试AI自动截图功能...');
  
  const testScript = path.join(packageDir, 'test-ai-screenshot.js');
  if (fs.existsSync(testScript)) {
    require(testScript);
  } else {
    console.error('❌ 测试脚本未找到:', testScript);
    process.exit(1);
  }
}

async function takeScreenshot() {
  console.log('📸 立即截图...');
  
  const http = require('http');
  
  const postData = JSON.stringify({
    filename: `cli-screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
  });
  
  const options = {
    hostname: 'localhost',
    port: 3026,
    path: '/api/screenshot',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('✅ 截图成功！');
          console.log(`📁 文件路径: ${response.path}`);
        } else {
          console.log('❌ 截图失败:', response.error);
        }
      } catch (error) {
        console.log('❌ 解析响应失败:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ 请求失败:', error.message);
    console.log('💡 请确保服务器正在运行: claude-browser-tools start');
  });

  req.write(postData);
  req.end();
}

async function showLogs() {
  console.log('📊 获取服务器日志...');
  
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3026,
    path: '/api/logs?limit=10',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log(`✅ 共找到 ${response.total} 条日志，显示最近 ${response.logs.length} 条:`);
          response.logs.forEach((log, index) => {
            console.log(`${index + 1}. [${log.level || 'info'}] ${log.message.substring(0, 100)}...`);
          });
        } else {
          console.log('❌ 获取日志失败:', response.error);
        }
      } catch (error) {
        console.log('❌ 解析响应失败:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ 请求失败:', error.message);
    console.log('💡 请确保服务器正在运行: claude-browser-tools start');
  });

  req.end();
}

async function showDebug() {
  console.log('🔧 获取调试信息...');
  
  const http = require('http');
  
  const options = {
    hostname: 'localhost',
    port: 3026,
    path: '/api/debug',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => data += chunk);
    res.on('end', () => {
      try {
        const response = JSON.parse(data);
        if (response.success) {
          const debug = response.debug;
          console.log('✅ 服务器调试信息:');
          console.log(`📍 服务器端口: ${debug.serverPort}`);
          console.log(`🔌 连接的客户端: ${debug.connectedClients}`);
          console.log(`📝 日志数量: ${debug.logsCount}`);
          console.log(`🌍 网络请求数量: ${debug.networkRequestsCount}`);
          console.log(`🌐 当前URL: ${debug.currentUrl || '未知'}`);
          console.log(`⏱️  运行时间: ${Math.floor(debug.uptime)} 秒`);
        } else {
          console.log('❌ 获取调试信息失败:', response.error);
        }
      } catch (error) {
        console.log('❌ 解析响应失败:', error.message);
      }
    });
  });

  req.on('error', (error) => {
    console.log('❌ 请求失败:', error.message);
    console.log('💡 请确保服务器正在运行: claude-browser-tools start');
  });

  req.end();
}

// 主程序逻辑
switch (command) {
  case 'start':
    startServer();
    break;
  
  case 'test':
    testScreenshot();
    break;
  
  case 'screenshot':
    takeScreenshot();
    break;
  
  case 'logs':
    showLogs();
    break;
  
  case 'debug':
    showDebug();
    break;
  
  case 'help':
  case '-h':
  case '--help':
    showHelp();
    break;
  
  default:
    console.log(`❌ 未知命令: ${command}`);
    console.log('💡 使用 claude-browser-tools help 查看帮助');
    process.exit(1);
}