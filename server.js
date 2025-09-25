import express from 'express'
import http from 'http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

import db from './db.js'
import { askGemini, ttsSave } from './vega_ai.js'

dotenv.config()
const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: process.env.CORS_ORIGIN || true, methods:['GET','POST'] } })

app.use(cors({ origin: process.env.CORS_ORIGIN || true }))
app.use(express.json({ limit: '12mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

// uploads
const UP = path.join(process.cwd(),'uploads')
if(!fs.existsSync(UP)) fs.mkdirSync(UP,{ recursive: true })
app.use('/uploads', express.static(UP))

const storage = multer.diskStorage({
  destination: (req,file,cb)=> cb(null, UP),
  filename: (req,file,cb)=> cb(null, Date.now()+'_'+file.originalname.replace(/\s+/g,'_'))
})
const upload = multer({ storage, limits: { fileSize: 40*1024*1024 } })

// REST: list channels
app.get('/api/channels', async (req,res)=>{
  await db.read()
  res.json(Object.keys(db.data.channels))
})

// REST: create channel (with category & permissions)
app.post('/api/channels', async (req,res)=>{
  const { name, category='General', permissions=[] } = req.body
  await db.read()
  if(!db.data.channels[name]) db.data.channels[name]=[]
  await db.write()
  res.json({ ok:true, channel: name })
})

// messages per channel (POST to send with optional file)
app.post('/api/channels/:channel/messages', upload.single('file'), async (req,res)=>{
  const channel = req.params.channel
  await db.read()
  if(!db.data.channels[channel]) db.data.channels[channel]=[]
  let type = 'text'
  let content = req.body.text || ''
  if(req.file){
    content = '/uploads/'+path.basename(req.file.path)
    if(req.file.mimetype.startsWith('image/')) type='image'
    else if(req.file.mimetype.startsWith('audio/')) type='audio'
    else type='file'
  }
  const msg = { id: Date.now().toString(), channel, text: content, type, from: req.body.from || 'anon', createdAt: new Date().toISOString(), edited:false, reactions:{}, pinned:false }
  db.data.channels[channel].push(msg)
  await db.write()
  io.to(channel).emit('message', msg)
  res.json({ ok:true, message: msg })
})

// get messages
app.get('/api/channels/:channel/messages', async (req,res)=>{
  const channel = req.params.channel
  await db.read()
  res.json(db.data.channels[channel] || [])
})

// Gemini text endpoint
app.post('/api/gemini', async (req,res)=>{
  const prompt = String(req.body.message || '')
  const reply = await askGemini(prompt)
  res.json({ reply })
})

// Gemini TTS
app.post('/api/gemini/tts', async (req,res)=>{
  const text = String(req.body.message || '')
  const url = await ttsSave(text)
  res.json({ url })
})

// Socket.IO: channel join, send, history
io.on('connection', socket=>{
  socket.on('join', async (channel)=>{
    socket.join(channel)
    await db.read()
    const history = db.data.channels[channel] || []
    socket.emit('history', { channel, history })
  })
  socket.on('send', async (data)=>{
    // data: { channel, text, from, type }
    await db.read()
    if(!db.data.channels[data.channel]) db.data.channels[data.channel] = []
    const msg = { id: Date.now().toString(), channel: data.channel, text: data.text, type: data.type||'text', from: data.from||'anon', createdAt: new Date().toISOString(), edited:false, reactions:{}, pinned:false }
    db.data.channels[data.channel].push(msg)
    await db.write()
    io.to(data.channel).emit('message', msg)
  })
})

const PORT = process.env.PORT || 4000
server.listen(PORT, '0.0.0.0', ()=> console.log('✅ Vega AI server corriendo en http://localhost:'+PORT))
