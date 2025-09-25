const socket = io()
let currentChannel = 'general'
let me = localStorage.getItem('vega_user') || ('u_'+Date.now())
localStorage.setItem('vega_user', me)

// UI elements
const channelsDiv = document.getElementById('channels')
const messagesDiv = document.getElementById('messages')
const msgInput = document.getElementById('msgInput')
const sendBtn = document.getElementById('sendBtn')
const newChannelBtn = document.getElementById('newChannelBtn')
const attachBtn = document.getElementById('attachBtn')
const fileInput = document.getElementById('fileInput')
const recordBtn = document.getElementById('recordBtn')
const aiBtn = document.getElementById('aiBtn')

// load channels
async function loadChannels(){
  const res = await fetch('/api/channels')
  const list = await res.json()
  channelsDiv.innerHTML = ''
  list.forEach(ch => {
    const el = document.createElement('div'); el.className='chan'; el.textContent = '# '+ch
    el.onclick = ()=> joinChannel(ch)
    channelsDiv.appendChild(el)
  })
}
loadChannels()

// join channel
function clearMessages(){ messagesDiv.innerHTML = '' }
function appendMessage(m){
  const d = document.createElement('div'); d.className = 'msg ' + (m.from===me ? 'me' : 'other')
  const meta = `<div class="meta">${m.from} • ${new Date(m.createdAt).toLocaleTimeString()}</div>`
  let content = ''
  if(m.type==='image') content = `<img src="${m.text}" style="max-width:220px;border-radius:8px" />`
  else if(m.type==='audio') content = `<audio controls src="${m.text}"></audio>`
  else if(m.type==='file') content = `<a href="${m.text}" target="_blank">📎 Archivo</a>`
  else content = `<div class="bubble">${escapeHtml(m.text)}</div>`
  d.innerHTML = meta + content
  messagesDiv.appendChild(d); messagesDiv.scrollTop = messagesDiv.scrollHeight
}
function escapeHtml(t){ return String(t).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }

async function joinChannel(ch){
  currentChannel = ch
  clearMessages()
  socket.emit('join', ch)
}
socket.on('history', ({ channel, history })=>{
  if(channel===currentChannel){
    clearMessages()
    history.forEach(m=>appendMessage(m))
  }
})
socket.on('message', (m)=>{
  if(m.channel===currentChannel) appendMessage(m)
})

// send message via REST + socket fallback
async function sendMessage(text, file=null){
  const fd = new FormData()
  fd.append('from', me)
  fd.append('text', text)
  if(file) fd.append('file', file)
  const res = await fetch(`/api/channels/${currentChannel}/messages`, { method:'POST', body: fd })
  const j = await res.json()
  // server emits via socket; UI will receive via socket
}

// UI events
sendBtn.addEventListener('click', ()=> {
  const t = msgInput.value.trim()
  if(!t) return
  sendMessage(t)
  msgInput.value = ''
})
msgInput.addEventListener('keypress', e=> { if(e.key==='Enter') sendBtn.click() })

newChannelBtn.addEventListener('click', async ()=>{
  const name = prompt('Nombre del nuevo canal:')
  if(!name) return
  await fetch('/api/channels', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ name }) })
  await loadChannels()
})

attachBtn.addEventListener('click', ()=> fileInput.click())
fileInput.addEventListener('change', async (e)=>{
  const f = e.target.files[0]; if(!f) return
  await sendMessage('', f)
})

// Recording audio (MediaRecorder)
let recorder, chunks = []
recordBtn.addEventListener('click', async ()=>{
  if(!recorder || recorder.state === 'inactive'){
    const stream = await navigator.mediaDevices.getUserMedia({ audio:true })
    recorder = new MediaRecorder(stream)
    chunks = []
    recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data) }
    recorder.onstop = async ()=>{
      const blob = new Blob(chunks, { type:'audio/webm' })
      await sendMessage('', blob)
    }
    recorder.start()
    recordBtn.textContent = '■ Detener'
  } else {
    recorder.stop()
    recordBtn.textContent = '🎤'
  }
})

// Vega AI quick DM: open or create a channel 'vega-ai'
aiBtn.addEventListener('click', async ()=>{
  const ch = 'vega-ai'
  // ensure channel exists
  await fetch('/api/channels', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ name: ch }) })
  await loadChannels()
  joinChannel(ch)
  // show quick prompt to ask AI
  const q = prompt('Pregúntale a Vega AI:')
  if(q) {
    // send to Gemini via backend and then post AI reply to channel
    const r = await fetch('/api/gemini', { method:'POST', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ message: q }) })
    const j = await r.json()
    // push AI reply into channel via server-side saving
    await fetch(`/api/channels/${ch}/messages`, { method:'POST', headers:{ }, body: (()=>{ const fd=new FormData(); fd.append('from','Vega AI'); fd.append('text', j.reply); return fd })() })
  }
})

// start in general
joinChannel('general')
