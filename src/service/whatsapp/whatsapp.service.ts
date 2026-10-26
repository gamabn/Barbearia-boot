import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import path from "node:path";
import { mkdir, rm } from "node:fs/promises";
import { processarMensagem } from "../atendimento.service.js";
import { garantirCliente } from "../responseApi/garantirCliente.js";
//import { Barbeiro } from "../../type/type.js";
import { Barbearia } from "../responseApi/consultarBarbearia.js";
import { verificarAcessoBot } from "../responseApi/verificarAcessoBot.js";
//import { type BarbeariaType } from "../../type/type.js";

type SessaoWhatsApp = {
  barbeariaId: string;
  authDirectory: string;
  socket?: ReturnType<typeof makeWASocket> | undefined;
  conectando: boolean;
  reconexaoAgendada: boolean;
  desconectando: boolean;
  qrCode?: string | undefined;
  status: "desconectado" | "conectando" | "aguardando_qr" | "conectado";
};

const sessoes = new Map<string, SessaoWhatsApp>();

//const barbeariaTeste = process.env.BARBERSHOP_ID;

function validarBarbeariaId(id: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new Error("ID da barbearia inválido.");
  }
}

/*function obterDiretorioAuth(barbeariaId: string): string {
  // Mantém intactas as credenciais da sessão de teste atual.
  if (barbeariaId === barbeariaTeste) {
    return path.resolve("auth_info");
  }

  return path.resolve("auth_info_sessoes", barbeariaId);
}*/
function obterDiretorioAuth(barbeariaId: string) {
  validarBarbeariaId(barbeariaId);

  return path.resolve("auth_info_sessoes", barbeariaId);
}

export function listarSessoesWhatsApp() {
  return Array.from(sessoes.values()).map((sessao) => ({
    barbeariaId: sessao.barbeariaId,
    conectando: sessao.conectando,
    reconexaoAgendada: sessao.reconexaoAgendada,
    conectada: sessao.status === "conectado",
  }));
}

//const newBraber = new Barbearia()
//export const barbeiro = await newBraber.consultar(barb)

export async function startWhatsApp(barbeariaId: string): Promise<void> {
  validarBarbeariaId(barbeariaId);

  // Verifica o plano antes de iniciar o WhatsApp
  const permitido = await verificarAcessoBot(barbeariaId);

  if (!permitido) {
    throw new Error(
      "O bot WhatsApp está disponível apenas no plano Completo ativo.",
    );
  }
  const existente = sessoes.get(barbeariaId);

  if (existente?.conectando || existente?.socket) {
    console.log(`ℹ️ Sessão já iniciada: ${barbeariaId}`);
    return;
  }

  const authDirectory = obterDiretorioAuth(barbeariaId);

  await mkdir(authDirectory, { recursive: true });

  const sessao: SessaoWhatsApp = {
    barbeariaId,
    authDirectory,
    conectando: true,
    reconexaoAgendada: false,
    desconectando: false,
    qrCode: undefined,
    status: "conectando",
  };

  sessoes.set(barbeariaId, sessao);

  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDirectory);

    const socket = makeWASocket({
      auth: state,
      printQRInTerminal: false,
    });

    sessao.socket = socket;

    socket.ev.on("creds.update", saveCreds);

    socket.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        sessao.qrCode = qr;
        sessao.status = "aguardando_qr";

        console.log(`📱 QR Code disponível para a barbearia ${barbeariaId}`);
      }

      if (connection === "open") {
        sessao.conectando = false;
        sessao.reconexaoAgendada = false;
        sessao.qrCode = undefined;
        sessao.status = "conectado";

        console.log(`✅ WhatsApp conectado: barbearia ${barbeariaId}`);
      }
      /*  if (connection === "open") {
        sessao.conectando = false;
        sessao.reconexaoAgendada = false;

        console.log(`✅ WhatsApp conectado: barbearia ${barbeariaId}`);
      }*/

      if (connection !== "close") return;

      if (sessao.desconectando) {
        console.log(`🔌 Desconexão manual da barbearia ${barbeariaId}.`);
        return;
      }
      sessao.qrCode = undefined;
      sessao.status = "desconectado";
      sessao.socket = undefined;
      sessao.conectando = false;

      const statusCode = (
        lastDisconnect?.error as {
          output?: { statusCode?: number };
        }
      )?.output?.statusCode;

      console.log(`🔌 Sessão ${barbeariaId} fechada. Código: ${statusCode}`);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log(`⚠️ Sessão revogada para a barbearia ${barbeariaId}.`);

        try {
          await rm(authDirectory, {
            recursive: true,
            force: true,
          });
        } catch (error) {
          console.error("Erro ao limpar credenciais:", error);
        }

        sessoes.delete(barbeariaId);
        return;
      }

      if (sessao.reconexaoAgendada) return;

      sessao.reconexaoAgendada = true;

      setTimeout(() => {
        if (sessao.desconectando) return;

        sessoes.delete(barbeariaId);

        void startWhatsApp(barbeariaId).catch((error) => {
          console.error(`❌ Erro ao reconectar ${barbeariaId}:`, error);
        });
      }, 3000);
    });

    const barbeariaService = new Barbearia();
    let nomeBarbearia: string | null = null;

    socket.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify") return;

      // Verifica a assinatura antes de processar mensagens
      try {
        const permitido = await verificarAcessoBot(barbeariaId);

        if (!permitido) {
          console.log(
            `🔒 Bot bloqueado para a barbearia ${barbeariaId}: plano sem acesso.`,
          );

          return;
        }
      } catch (error) {
        console.error(
          `❌ Erro ao verificar assinatura da barbearia ${barbeariaId}:`,
          error,
        );

        // Se não conseguir consultar o backend, não processa mensagens
        return;
      }

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
        //=======================================
        // Protege os dados enquanto o atendimento ainda usa
        // a configuração fixa da barbearia de teste.
        //  if (barbeariaId !== barbeariaTeste) {
        //console.log(
        //    `📩 Mensagem recebida na barbearia ${barbeariaId}. ` +
        //      "Atendimento ainda aguardando contexto multiempresa.",
        //  );
        //  continue;
        // }
        //====================================================
        const chave = message.key as typeof message.key & {
          remoteJidAlt?: string;
        };

        const identificadorTelefone = chave.remoteJidAlt?.endsWith(
          "@s.whatsapp.net",
        )
          ? chave.remoteJidAlt
          : remoteJid.endsWith("@s.whatsapp.net")
            ? remoteJid
            : null;

        try {
          let clienteId = "";
          let clientePhone = "";

          if (identificadorTelefone) {
            const telefone = identificadorTelefone.split("@")[0] ?? "";
            const nome = message.pushName?.trim() || "Cliente WhatsApp";

            const cliente = await garantirCliente(telefone, nome, barbeariaId);

            clienteId = cliente.id ?? cliente.client_id ?? "";
            clientePhone = cliente.client_phone ?? "";

            if (!clienteId) {
              throw new Error("A API não retornou o ID do cliente.");
            }
          }

          if (!identificadorTelefone) {
            console.warn(
              `⚠️ Telefone não identificado na barbearia ${barbeariaId}: ${remoteJid}`,
            );

            continue;
          }

          // Consulta o nome da barbearia uma única vez por conexão
          if (!nomeBarbearia) {
            const barbearia = await barbeariaService.consultar(barbeariaId);
            nomeBarbearia = barbearia.name;
          }

          const resposta = await processarMensagem(
            remoteJid,
            texto,
            clienteId,
            clientePhone,
            barbeariaId,
            nomeBarbearia,
          );

          // Confirma se a assinatura continua autorizada
          const aindaPermitido = await verificarAcessoBot(barbeariaId);

          if (!aindaPermitido) {
            console.log(
              `🔒 Resposta bloqueada: barbearia ${barbeariaId} sem acesso ao bot.`,
            );
            continue;
          }

          await socket.sendMessage(remoteJid, { text: resposta });
        } catch (error) {
          console.error(
            `❌ Erro no atendimento da barbearia ${barbeariaId}:`,
            error,
          );

          await socket
            .sendMessage(remoteJid, {
              text: "Não consegui processar seu atendimento agora. Tente novamente em instantes.",
            })

            .catch((erro) => {
              console.error("Erro ao enviar mensagem:", erro);
            });
        }
      }
    });
  } catch (error) {
    sessoes.delete(barbeariaId);
    throw error;
  }
}
export function obterStatusWhatsApp(barbeariaId: string) {
  validarBarbeariaId(barbeariaId);

  const sessao = sessoes.get(barbeariaId);

  if (!sessao) {
    return {
      barbeariaId,
      status: "desconectado",
      qrCode: null,
    };
  }

  return {
    barbeariaId,
    status: sessao.status,
    qrCode: sessao.qrCode ?? null,
  };
}

export async function desconectarWhatsApp(barbeariaId: string): Promise<void> {
  validarBarbeariaId(barbeariaId);

  const sessao = sessoes.get(barbeariaId);

  // Obtém o diretório correto mesmo sem sessão na memória
  const authDirectory = obterDiretorioAuth(barbeariaId);

  if (sessao) {
    if (sessao.desconectando) {
      throw new Error("Desconexão já está em andamento.");
    }

    sessao.desconectando = true;
    sessao.reconexaoAgendada = false;

    try {
      if (sessao.socket) {
        await sessao.socket.logout();
      }
    } catch (error) {
      sessao.desconectando = false;
      console.error("❌ Erro ao desvincular WhatsApp:", error);
      throw error;
    }

    // Impede reutilização da sessão em memória
    sessoes.delete(barbeariaId);
  }

  // Remove somente a pasta desta barbearia
  await rm(authDirectory, {
    recursive: true,
    force: true,
  });

  console.log(`🗑️ Credenciais removidas: ${authDirectory}`);

  console.log(`✅ Sessão da barbearia ${barbeariaId} removida.`);
}

//=====================================================================

/*import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import path from "node:path";
import { processarMensagem } from "../atendimento.service.js";
import { rm } from "node:fs/promises";
import { garantirCliente } from "../responseApi/garantirCliente.js";

type SessaoWhatsApp = {
  barbeariaId: string;
  authDirectory: string;
  socket?: ReturnType<typeof makeWASocket>;
  conectando: boolean;
  reconexaoAgendada: boolean;
}

//const authDirectory = path.resolve("auth_info");
const sessoes = new Map<string, SessaoWhatsApp>();

const barbeariaTeste = process.env.BARBERSHOP_ID;

export async function startWhatsApp(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(authDirectory);

  const socket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", async (update) => {
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

      console.log("Código da desconexão:", statusCode);

      if (statusCode === DisconnectReason.loggedOut) {
        console.log("⚠️ Sessão revogada. Preparando novo QR Code...");

        try {
          await rm(authDirectory, {
            recursive: true,
            force: true,
          });

          console.log("🧹 Credenciais antigas removidas.");

          setTimeout(() => {
            void startWhatsApp().catch((error) => {
              console.error("❌ Erro ao iniciar nova sessão:", error);
            });
          }, 1500);
        } catch (error) {
          console.error("❌ Erro ao limpar a sessão:", error);
        }

        return;
      }

      console.log("🔄 Conexão perdida. Tentando reconectar...");

      setTimeout(() => {
        void startWhatsApp().catch((error) => {
          console.error("❌ Erro ao reconectar WhatsApp:", error);
        });
      }, 3000);
    }
  });

  //==================================================================

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

      const chave = message.key as typeof message.key & {
        remoteJidAlt?: string;
      };

      const identificadorTelefone = chave.remoteJidAlt?.endsWith(
        "@s.whatsapp.net",
      )
        ? chave.remoteJidAlt
        : remoteJid.endsWith("@s.whatsapp.net")
          ? remoteJid
          : null;

      let clienteId: string | undefined;
      let clientePhone: string | undefined;

      try {
        if (identificadorTelefone) {
          const telefone = identificadorTelefone.split("@")[0] ?? "";
          const nome = message.pushName?.trim() || "Cliente WhatsApp";
          console.log("telefone  cadastrado", telefone);
          const cliente = await garantirCliente(telefone, nome);

          clienteId = cliente.id ?? cliente.client_id;
          clientePhone = cliente.client_phone;

          if (!clienteId) {
            throw new Error("A API não retornou o ID do cliente.");
          }

          console.log(
            "✅ Cliente identificado:",
            cliente.id ?? cliente.client_id ?? "(ID não retornado)",
          );
        } else {
          console.log(
            "⚠️ Telefone não identificado; cadastro do cliente adiado.",
          );
        }

        const resposta = await processarMensagem(
          remoteJid,
          texto,
          clienteId ?? "",
          clientePhone ?? "",
        );

        await socket.sendMessage(remoteJid, {
          text: resposta,
        });

        console.log("✅ Resposta enviada.");
      } catch (error) {
        console.error("❌ Erro ao processar mensagem:", error);

        try {
          await socket.sendMessage(remoteJid, {
            text: "Não consegui processar seu atendimento agora. Tente novamente em instantes.",
          });
        } catch (erroEnvio) {
          console.error("❌ Erro ao enviar mensagem de erro:", erroEnvio);
        }
      }
    }
  });
}*/
//=======================================================================

// try {
///  const resposta = await processarMensagem(remoteJid, texto);

//   await socket.sendMessage(remoteJid, {
//    text: resposta,
//   });

//   console.log("✅ Resposta enviada.");
// } catch (error) {
//    console.error("❌ Erro ao responder mensagem:", error);
//  }
// }
// });
//}
