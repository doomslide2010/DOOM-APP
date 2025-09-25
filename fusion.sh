#!/bin/bash
# fusion.sh - Instalador TODO en UNO con acceso LAN
set -e

echo "🚀 Instalando FusionChat (WhatsApp + Discord style)..."

# 1. Dependencias
apt update -y && apt upgrade -y
apt install -y nodejs npm git

# 2. Crear carpeta limpia
APP_DIR=~/FUSION-APP
rm -rf $APP_DIR
mkdir -p $APP_DIR
cd $APP_DIR

# 3. Backend
echo "📦 Backend..."
mkdir backend && cd backend
npm init -y
npm install express socket.io cors lowdb
cat <<'JS' > server.js
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// DB
const adapter = new JSONFile("db.json");
const db = new Low(adapter, { users: [], chats: [], categories: [] });
await db.read();
await db.write();

// WebSockets
io.on("connection", (socket) => {
  console.log("✅ Usuario conectado", socket.id);
  socket.on("msg", async (data) => {
    db.data.chats.push(data);
    await db.write();
    io.emit("msg", data);
  });
});

app.get("/", (req, res) => res.send("FusionChat backend online"));
server.listen(4000, "0.0.0.0", () => console.log("🔥 Backend en http://0.0.0.0:4000"));
JS
cd ..

# 4. Frontend
echo "🎨 Frontend..."
npx create-react-app frontend --template cra-template-pwa
cd frontend
npm install socket.io-client tailwindcss framer-motion @heroicons/react
npx tailwindcss init -p

cat <<'CFG' > tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
CFG

cat <<'JS' > src/App.js
import React, { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:4000");

function App() {
  const [msg, setMsg] = useState("");
  const [chat, setChat] = useState([]);

  useEffect(() => {
    socket.on("msg", (data) => setChat((prev) => [...prev, data]));
    return () => socket.off("msg");
  }, []);

  const send = () => {
    socket.emit("msg", { text: msg, user: "Yo", time: new Date().toLocaleTimeString() });
    setMsg("");
  };

  return (
    <div className="h-screen flex">
      {/* Sidebar estilo Discord */}
      <div className="w-64 bg-gray-900 text-white p-4">
        <h1 className="text-xl font-bold mb-4">FusionChat</h1>
        <p>📁 Categorías</p>
        <p>💬 Chats</p>
        <p>🎙️ Voice</p>
      </div>
      {/* Chat estilo WhatsApp */}
      <div className="flex-1 flex flex-col bg-gray-100">
        <div className="flex-1 overflow-y-auto p-4">
          {chat.map((c, i) => (
            <div key={i} className="p-2 bg-white rounded shadow mb-2">
              <b>{c.user}:</b> {c.text} <span className="text-xs">{c.time}</span>
            </div>
          ))}
        </div>
        <div className="p-4 flex">
          <input className="flex-1 border rounded p-2" value={msg} onChange={(e) => setMsg(e.target.value)} />
          <button onClick={send} className="ml-2 bg-green-500 text-white px-4 py-2 rounded">Enviar</button>
        </div>
      </div>
    </div>
  );
}
export default App;
JS
cd ..

# 5. Lanzador único
echo "🛠️ Creando lanzador único..."
npm init -y
npm install concurrently --save-dev
cat <<'JSON' > package.json
{
  "name": "fusion-app",
  "version": "1.0.0",
  "scripts": {
    "start": "concurrently \\"node backend/server.js\\" \\"HOST=0.0.0.0 PORT=8080 npm start --prefix frontend\\""
  }
}
JSON

echo "✅ Instalación lista"
echo "👉 Para arrancar todo: cd ~/FUSION-APP && npm start"
echo "🌐 Luego abre desde otro dispositivo: http://TU-IP:8080"
