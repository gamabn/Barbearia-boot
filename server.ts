import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { startWhatsApp } from "./src/service/whatsapp/whatsapp.service.js";

const app = express();

app.use(cors());

app.use(express.json());

const httpServer = createServer(app);

const PORT = Number(process.env.PORT) || 3003;

startWhatsApp().catch((error) => {
  console.error("❌ Erro ao iniciar o WhatsApp:", error);
});

httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
