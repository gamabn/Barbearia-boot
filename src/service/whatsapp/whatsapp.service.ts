import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import path from "node:path";
import { processarMensagem } from "../atendimento.service.js";

const authDirectory = path.resolve("auth_info");

export async function startWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(authDirectory);

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n📱 Escaneie este QR Code com o WhatsApp:\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("✅ WhatsApp conectado com sucesso!");
    }

    if (connection === "close") {
      const statusCode = (
        lastDisconnect?.error as {
          output?: { statusCode?: number };
        }
      )?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        console.log(
          "⚠️ WhatsApp desconectado. Será necessário autenticar novamente.",
        );
        return;
      }

      console.log("🔄 Conexão perdida. Tentando reconectar...");

      setTimeout(() => {
        void startWhatsApp().catch((error) => {
          console.error("Erro ao reconectar WhatsApp:", error);
        });
      }, 3000);
    }
  });

  socket.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;

      const remoteJid = message.key.remoteJid;

      if (
        !remoteJid ||
        remoteJid === "status@broadcast" ||
        remoteJid.endsWith("@g.us")
      ) {
        continue;
      }

      const texto =
        message.message.conversation ??
        message.message.extendedTextMessage?.text ??
        message.message.imageMessage?.caption ??
        "";

      if (!texto.trim()) continue;

      console.log(`📩 Mensagem recebida de ${remoteJid}: ${texto}`);

      try {
        const resposta = await processarMensagem(remoteJid, texto);

        await socket.sendMessage(remoteJid, {
          text: resposta,
        });

        console.log("✅ Resposta enviada.");
      } catch (error) {
        console.error("❌ Erro ao responder mensagem:", error);
      }
    }
  });
}
