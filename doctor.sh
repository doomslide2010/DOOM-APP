#!/data/data/com.termux/files/usr/bin/bash
# Script Doctor: arregla errores de DB en Vega AI App

APP_DIR="$HOME/DOOM-APP"

echo "🚑 Doctor revisando tu app en $APP_DIR..."

# 1. Verificar si existe el archivo db.js
if [ ! -f "$APP_DIR/db.js" ]; then
  echo "⚠️ No se encontró db.js, creando uno nuevo..."
  cat > $APP_DIR/db.js <<'JS'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Ruta al archivo de la base de datos
const adapter = new JSONFile('./db.json')
const db = new Low(adapter, { users: [], groups: [] }) // Default data

// Cargar datos
await db.read()

// Si está vacío, asignar defaults
db.data ||= { users: [], groups: [] }
await db.write()

export default db
JS
  echo "✅ db.js creado con defaults."
else
  echo "🛠 Reparando db.js existente..."
  cat > $APP_DIR/db.js <<'JS'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'

// Ruta al archivo de la base de datos
const adapter = new JSONFile('./db.json')
const db = new Low(adapter, { users: [], groups: [] }) // Default data

// Cargar datos
await db.read()

// Si está vacío, asignar defaults
db.data ||= { users: [], groups: [] }
await db.write()

export default db
JS
  echo "✅ db.js reparado con defaults."
fi

# 2. Verificar si existe db.json
if [ ! -f "$APP_DIR/db.json" ]; then
  echo "⚠️ No se encontró db.json, creando uno vacío..."
  echo '{ "users": [], "groups": [] }' > $APP_DIR/db.json
  echo "✅ db.json creado."
else
  echo "📂 db.json ya existe, no se toca."
fi

echo "🚑 Doctor terminó. Ya puedes reiniciar con:"
echo "cd $APP_DIR && npx nodemon server.js"
