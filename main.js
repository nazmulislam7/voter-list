
const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Voter Slip Generator",
    icon: path.join(__dirname, 'icon.ico'), // আপনার যদি আইকন থাকে
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // লোকাল ফাইল লোড করার জন্য
  // ডেভেলপমেন্টের সময়: win.loadURL('http://localhost:5173');
  win.loadFile('index.html');
  
  // মেনু বার হাইড করতে চাইলে
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
