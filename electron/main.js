const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const http = require('http');
const net = require('net');

let mainWindow = null;

// 获取可用随机端口
function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', reject);
  });
}

// 轮询检查 Next.js 服务是否已就绪
function waitForServer(port, timeoutMs = 15000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.get(`http://127.0.0.1:${port}`, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 500) {
          resolve(true);
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.end();
    };

    const retry = () => {
      if (Date.now() - startTime > timeoutMs) {
        reject(new Error('Server start timed out'));
      } else {
        setTimeout(check, 100);
      }
    };

    check();
  });
}

async function startNextServer(port) {
  let serverDir;
  if (app.isPackaged) {
    serverDir = path.join(process.resourcesPath, 'standalone');
  } else {
    serverDir = path.join(__dirname, '..', '.next', 'standalone');
  }

  const serverPath = path.join(serverDir, 'server.js');
  const standaloneNodeModules = path.join(serverDir, 'node_modules');

  console.log(`[Electron] Starting Next.js server at: ${serverPath} on port ${port}`);

  // 注册依赖搜索路径，确保主进程能准确找到 standalone/node_modules 下的 next 等依赖
  const Module = require('module');
  if (!Module.globalPaths.includes(standaloneNodeModules)) {
    Module.globalPaths.push(standaloneNodeModules);
  }
  process.env.NODE_PATH = standaloneNodeModules;
  if (Module._initPaths) {
    Module._initPaths();
  }

  process.env.PORT = port.toString();
  process.env.HOSTNAME = '127.0.0.1';
  process.env.NODE_ENV = 'production';

  // 切换工作目录到 standalone，使 Next.js 能够正确解析静态资源与页面
  process.chdir(serverDir);

  // 直接在主进程中加载 Next.js 独立服务端
  require(serverPath);

  await waitForServer(port);
}

function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 1000,
    minHeight: 700,
    title: 'SNS 运营数据监控看板',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    backgroundColor: '#090d16',
    show: false,
  });

  // 移除原生菜单栏
  Menu.setApplicationMenu(null);

  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 单实例锁：防止重复打开多个桌面进程
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    try {
      const port = await getFreePort();
      await startNextServer(port);
      createWindow(port);
    } catch (err) {
      console.error('[Electron] Failed to start application:', err);
      dialog.showErrorBox('程序启动异常', `后台服务启动失败: ${err.message || err}`);
      app.quit();
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
}
