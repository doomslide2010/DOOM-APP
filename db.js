import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Ruta al archivo JSON
const adapter = new JSONFile('./db.json')

// ⚡ Aquí pasamos datos iniciales obligatorios
const defaultData = { users: [], chats: [], channels: [] }

const db = new Low(adapter, defaultData)

await db.read()

// Si el archivo estaba vacío, se rellenará con defaultData
db.data ||= defaultData

await db.write()

export default db
