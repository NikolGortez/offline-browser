// main.js
// ============ IMPORT’Ы ============
const path = require('path');
const { app, BrowserWindow } = require('electron');
const { spawn } = require('child_process'); 

// ============ ПЕРЕМЕННЫЕ ============
let mainWindow = null;
let serverProcess = null;
const SERVER_PORT = 3000; // тот же порт, что у index.js

// ============ ФУНКЦИЯ ЗАПУСКА СЕРВЕРА ============
function startServer() {
  // Запускаем ваш index.js как дочерний Node-процесс
  serverProcess = spawn(
    process.execPath,       // путь к node.exe, т.е. тот же Node, что и для Electron
    [ path.join(__dirname, 'index.js') ],
    {
      cwd: __dirname,
      env: process.env,
      stdio: 'inherit'       // чтобы видеть лог сервера прямо в консоли Electron
    }
  );

  serverProcess.on('error', (err) => {
    console.error('Не удалось запустить сервер:', err);
  });
  serverProcess.on('exit', (code, signal) => {
    console.log(`Сервер завершился с кодом ${code} (${signal})`);
    serverProcess = null;
  });
}

// ============ ФУНКЦИЯ СОЗДАНИЯ ОКНА ELECTRON ============
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      nodeIntegration: false,    // фронтенду не нужен прямой node-доступ
      contextIsolation: true,    // из соображений безопасности
      preload: path.join(__dirname, 'preload.js') // опционально, если нужен bridge
    }
  });

  // Открываем наш локальный сервер
  mainWindow.loadURL(`http://localhost:${SERVER_PORT}`);
  // mainWindow.webContents.openDevTools(); // → можно раскомментить для отладки

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ============ СЛУШАЕМ СОБЫТИЯ APP ============
app.on('ready', () => {
  // Сначала запускаем Node-сервер
  startServer();

  // Ждём небольшую паузу, чтобы сервер успел подняться, потом открываем окно
  // (Можно усложнить: ждать успешного «ping» на http://localhost:3000)
  setTimeout(createWindow, 800);
});

app.on('window-all-closed', () => {
  // Закрываем сервер, когда окно закрыто
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  // Для macOS обычно не выходим из процесса,
  // но пусть для простоты мы завершим всё:
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
preload: path.join(__dirname, 'preload.js')
