// DOOM APP - Servidor base
const express = require("express");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.json());

// Ruta principal
app.get("/", (req, res) => {
  res.send("🚀 DOOM APP está corriendo!");
});

// Servidor en puerto 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor DOOM APP listo en http://localhost:${PORT}`);
});
