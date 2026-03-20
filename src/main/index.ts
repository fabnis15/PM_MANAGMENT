import { app, BrowserWindow, ipcMain, shell } from 'electron'
import path from 'path'
import * as db from './database'

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 680,
    backgroundColor: '#0f172a',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.once('ready-to-show', () => win.show())

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function registerHandlers() {
  ipcMain.handle('db:getPeople', () => db.getPeople())
  ipcMain.handle('db:createPerson', (_, data) => db.createPerson(data))
  ipcMain.handle('db:updatePerson', (_, id, data) => db.updatePerson(id, data))
  ipcMain.handle('db:deletePerson', (_, id) => db.deletePerson(id))

  ipcMain.handle('db:getProjects', () => db.getProjects())
  ipcMain.handle('db:createProject', (_, data) => db.createProject(data))
  ipcMain.handle('db:updateProject', (_, id, data) => db.updateProject(id, data))
  ipcMain.handle('db:deleteProject', (_, id) => db.deleteProject(id))

  ipcMain.handle('db:getAllocations', () => db.getAllocations())
  ipcMain.handle('db:createAllocation', (_, data) => db.createAllocation(data))
  ipcMain.handle('db:updateAllocation', (_, id, data) => db.updateAllocation(id, data))
  ipcMain.handle('db:deleteAllocation', (_, id) => db.deleteAllocation(id))

  ipcMain.handle('db:getMilestones', (_, projectId?) => db.getMilestones(projectId))
  ipcMain.handle('db:createMilestone', (_, data) => db.createMilestone(data))
  ipcMain.handle('db:updateMilestone', (_, id, data) => db.updateMilestone(id, data))
  ipcMain.handle('db:deleteMilestone', (_, id) => db.deleteMilestone(id))

  ipcMain.handle('db:getSettings', () => db.getSettings())
  ipcMain.handle('db:updateSettings', (_, data) => db.updateSettings(data))

  ipcMain.handle('db:getHolidays', () => db.getHolidays())
  ipcMain.handle('db:createHoliday', (_, data) => db.createHoliday(data))
  ipcMain.handle('db:updateHoliday', (_, id, data) => db.updateHoliday(id, data))
  ipcMain.handle('db:deleteHoliday', (_, id) => db.deleteHoliday(id))

  ipcMain.handle('db:getLeaves', () => db.getLeaves())
  ipcMain.handle('db:createLeave', (_, data) => db.createLeave(data))
  ipcMain.handle('db:updateLeave', (_, id, data) => db.updateLeave(id, data))
  ipcMain.handle('db:deleteLeave', (_, id) => db.deleteLeave(id))

  ipcMain.handle('db:getMonthlyRevenues', () => db.getMonthlyRevenues())
  ipcMain.handle('db:upsertMonthlyRevenue', (_, data) => db.upsertMonthlyRevenue(data))
  ipcMain.handle('db:deleteMonthlyRevenue', (_, projectId, year, month) => db.deleteMonthlyRevenue(projectId, year, month))

  ipcMain.handle('db:getWorkExceptions', () => db.getWorkExceptions())
  ipcMain.handle('db:upsertWorkException', (_, data) => db.upsertWorkException(data))
  ipcMain.handle('db:deleteWorkException', (_, personId, date) => db.deleteWorkException(personId, date))
}

app.whenReady().then(() => {
  registerHandlers()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
