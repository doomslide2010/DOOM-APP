import fetch from 'node-fetch'
import gTTS from 'gtts'
import fs from 'fs'
import path from 'path'
const KEY = process.env.GEMINI_API_KEY || ''

export async function askGemini(prompt){
  if(!KEY) return "⚠️ Gemini API key no configurada."
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key="+KEY
  try{
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ contents:[{ parts:[{ text: prompt }] }] })
    })
    const j = await resp.json()
    return j.candidates?.[0]?.content?.parts?.[0]?.text || "No hubo respuesta."
  }catch(e){
    console.error("Gemini error:", e)
    return "Error al contactar Gemini."
  }
}

export async function ttsSave(text){
  const outdir = path.join(process.cwd(),'public','tts')
  if(!fs.existsSync(outdir)) fs.mkdirSync(outdir, { recursive: true })
  const out = path.join(outdir, 'tts_'+Date.now()+'.mp3')
  await new Promise((res,rej)=> new gTTS(text,'es').save(out, err=> err?rej(err):res()))
  return '/tts/'+path.basename(out)
}
