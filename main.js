const { app, BrowserWindow, ipcMain } = require('electron');
const http = require('http');
const url = require('node:url');
const path = require('path');
const { initialize, trackEvent } = require("@aptabase/electron/main");
const crypto = require('crypto');

let mainWindow;
let server

initialize("A-US-6519295770"); //statistics


function createWindow() {
  trackEvent("app_started");
  mainWindow = new BrowserWindow({
    title: "Callbacker",
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    //titleBarStyle: 'hidden',
    frame: false,
    icon: path.join(__dirname, 'icon.png') // 应用图标的路径
  });

  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', createWindow);

// 监听从渲染进程来的启动服务器的消息
ipcMain.on('start-server', (event, port) => {
  startHttpServer(port);
});

function startHttpServer(port) {
  server = http.createServer((req, res) => {
    // 解析请求，包括headers和body
    let body = [];

    let bodySize = parseInt(req.headers['content-length'], 10) || 0;
    let headersSize = 0;
    let totalSize = 0;

    // 计算请求头的大小
    const headerKeys = Object.keys(req.headers);
    headerKeys.forEach(key => {
      // 头名: 头值\r\n，所以每个头部的大小是 key.length + value.length + 4
      headersSize += key.length + req.headers[key].length + 4;
    });

    // 请求行的大小大概是方法名 + URL + 版本 + 4（两个空格和\r\n）
    headersSize += req.method.length + req.url.length + 8 + 'HTTP/1.1'.length;


    req.on('data', (chunk) => {
      body.push(chunk);
      bodySize += chunk.length;
    }).on('end', () => {
      body = Buffer.concat(body).toString();
      totalSize = headersSize + bodySize;
      // 第二个参数为true表示解析query字符串
      const parsedUrl = url.parse(req.url, true);

      let ip = req.socket.remoteAddress;

      // 如果你的服务器在代理后面，比如 nginx
      // 使用 x-forwarded-for 头部可能会有用
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) {
        ip = forwarded.split(',')[0]; // 取 x-forwarded-for 头部的第一个 IP（客户端真实 IP）
      }



      // 请求详情
      const requestDetail = {
        id: crypto.randomUUID(),
        ip: ip,
        size: totalSize,
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: body,
        queries: parsedUrl.query,
        httpVersion: `${req.httpVersionMajor}.${req.httpVersionMinor}`,
        time: new Date()
      };

      // 将请求详情发送到渲染进程
      if (mainWindow) {
        mainWindow.webContents.send('request-received', requestDetail);
      }

      // 响应请求（简单示例）
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(`Request received by Callbacker ID:${requestDetail.id}`);
    });
  });

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

// 处理来自渲染进程的停止服务器的消息
ipcMain.on('stop-server', () => {
  server.close();
});



ipcMain.on('minimize-app', () => {
  mainWindow.minimize();
});

// 监听最大化/恢复命令
ipcMain.on('maximize-restore-app', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.restore();
  } else {
    mainWindow.maximize();
  }
});

// 监听关闭命令
ipcMain.on('close-app', () => {
  mainWindow.close();
});