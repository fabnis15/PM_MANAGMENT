import { contextBridge, ipcRenderer } from 'electron'

const api = {
  getPeople: () => ipcRenderer.invoke('db:getPeople'),
  createPerson: (d: unknown) => ipcRenderer.invoke('db:createPerson', d),
  updatePerson: (id: number, d: unknown) => ipcRenderer.invoke('db:updatePerson', id, d),
  deletePerson: (id: number) => ipcRenderer.invoke('db:deletePerson', id),

  getProjects: () => ipcRenderer.invoke('db:getProjects'),
  createProject: (d: unknown) => ipcRenderer.invoke('db:createProject', d),
  updateProject: (id: number, d: unknown) => ipcRenderer.invoke('db:updateProject', id, d),
  deleteProject: (id: number) => ipcRenderer.invoke('db:deleteProject', id),

  getAllocations: () => ipcRenderer.invoke('db:getAllocations'),
  createAllocation: (d: unknown) => ipcRenderer.invoke('db:createAllocation', d),
  updateAllocation: (id: number, d: unknown) => ipcRenderer.invoke('db:updateAllocation', id, d),
  deleteAllocation: (id: number) => ipcRenderer.invoke('db:deleteAllocation', id),

  getMilestones: (projectId?: number) => ipcRenderer.invoke('db:getMilestones', projectId),
  createMilestone: (d: unknown) => ipcRenderer.invoke('db:createMilestone', d),
  updateMilestone: (id: number, d: unknown) => ipcRenderer.invoke('db:updateMilestone', id, d),
  deleteMilestone: (id: number) => ipcRenderer.invoke('db:deleteMilestone', id),

  getSettings: () => ipcRenderer.invoke('db:getSettings'),
  updateSettings: (d: unknown) => ipcRenderer.invoke('db:updateSettings', d)
}

contextBridge.exposeInMainWorld('api', api)
export type API = typeof api
