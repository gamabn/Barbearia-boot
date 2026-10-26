import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "node:http";
import {
  startWhatsApp,
  listarSessoesWhatsApp,
  desconectarWhatsApp,
  obterStatusWhatsApp,
} from "./src/service/whatsapp/whatsapp.service.js";
import path from "node:path";
import { readdir, access } from "node:fs/promises";
//import { Barbearia } from "./src/service/atendimento.service.js";

const app = express();

app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const PORT = Number(process.env.PORT) || 3003;
//===============================================================
 //const barber =  new Barbearia()
 // export const barbeiro = barber.consultar()
//=========================================================================

function autenticarBot(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const segredo = process.env.BOT_API_SECRET;

  if (!segredo) {
    return res.status(503).json({
      erro: "BOT_API_SECRET não configurado no servidor.",
    });
  }

  if (req.headers["x-bot-api-secret"] !== segredo) {
    return res.status(401).json({
      erro: "Não autorizado.",
    });
  }

  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "online" });
});

app.get("/whatsapp/sessoes", autenticarBot, (_req, res) => {
  res.json(listarSessoesWhatsApp());
});

app.delete(
  "/whatsapp/:barbeariaId/desconectar",
  autenticarBot,
  async (req, res, next) => {
    try {
      const param = req.params.barbeariaId;

      const barbeariaId = Array.isArray(param) ? param[0] : param;

      if (!barbeariaId) {
        return res.status(400).json({
          erro: "ID da barbearia não informado.",
        });
      }

 
      await desconectarWhatsApp(barbeariaId);

      return res.status(200).json({
        mensagem: "WhatsApp desconectado com sucesso.",
        barbeariaId,
      });
    } catch (error) {
      next(error);
    }
  },
);

app.post(
  "/whatsapp/:barbeariaId/iniciar",
  autenticarBot,
  async (req, res, next) => {
    try {
      const paramBarbeariaId = req.params.barbeariaId;
      const barbeariaId = Array.isArray(paramBarbeariaId)
        ? paramBarbeariaId[0]
        : paramBarbeariaId;

      if (!barbeariaId) {
        return res.status(400).json({
          erro: "ID da barbearia não informado.",
        });
      }

      await startWhatsApp(barbeariaId);

      return res.status(202).json({
        mensagem: "Inicialização da sessão solicitada.",
        barbeariaId,
      });
    } catch (error) {
      return next(error);
    }
  },
);

app.use(
  (
    error: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error("Erro na API do bot:", error);

    res.status(500).json({
      erro:
        error instanceof Error ? error.message : "Erro interno do servidor.",
    });
  },
);

app.get("/whatsapp/:barbeariaId/status", autenticarBot, (req, res, next) => {
  try {
    const param = req.params.barbeariaId;

    const barbeariaId = Array.isArray(param) ? param[0] : param;

    if (!barbeariaId) {
      return res.status(400).json({
        erro: "ID da barbearia não informado.",
      });
    }

    return res.status(200).json(obterStatusWhatsApp(barbeariaId));
  } catch (error) {
    return next(error);
  }
});

async function restaurarSessoesWhatsApp() {
  console.log("🔄 Procurando sessões do WhatsApp salvas...");

  const barbearias = new Set<string>();

  // 1. Recuperar a barbearia configurada no .env
  // const barbeariaPrincipal = process.env.BARBERSHOP_ID;

  /* if (barbeariaPrincipal) {
    const diretorioPrincipal = path.resolve("auth_info");

    try {
      await access(path.join(diretorioPrincipal, "creds.json"));

      barbearias.add(barbeariaPrincipal);

      console.log(`📱 Sessão principal encontrada: ${barbeariaPrincipal}`);
    } catch {
      console.log("ℹ️ Nenhuma sessão principal salva.");
    }
  }*/

  // 2. Recuperar as sessões das outras barbearias
  const diretorioSessoes = path.resolve("auth_info_sessoes");

  try {
    const diretorios = await readdir(diretorioSessoes, {
      withFileTypes: true,
    });

    for (const diretorio of diretorios) {
      if (!diretorio.isDirectory()) continue;

      const barbeariaId = diretorio.name;

      // Ignorar diretórios com identificadores inválidos
      if (!/^[a-zA-Z0-9_-]+$/.test(barbeariaId)) {
        continue;
      }

      const arquivoCredenciais = path.join(
        diretorioSessoes,
        barbeariaId,
        "creds.json",
      );

      try {
        await access(arquivoCredenciais);

        barbearias.add(barbeariaId);

        console.log(`📱 Sessão encontrada: ${barbeariaId}`);
      } catch {
        console.log(`⚠️ Sessão ${barbeariaId} sem credenciais. Ignorando.`);
      }
    }
  } catch (error) {
    const erro = error as NodeJS.ErrnoException;

    if (erro.code !== "ENOENT") {
      console.error("❌ Erro ao procurar sessões:", error);
    }
  }

  // 3. Iniciar as sessões encontradas
  console.log(`📊 Total de sessões encontradas: ${barbearias.size}`);

  for (const barbeariaId of barbearias) {
    try {
      console.log(`🔄 Restaurando WhatsApp: ${barbeariaId}`);

      await startWhatsApp(barbeariaId);
    } catch (error) {
      console.error(`❌ Erro ao restaurar sessão ${barbeariaId}:`, error);
    }
  }

  console.log("✅ Inicialização das sessões solicitada.");
}
httpServer.listen(PORT, () => {
  console.log(`🚀 Bot rodando na porta ${PORT}`);

  void restaurarSessoesWhatsApp().catch((error) => {
    console.error("❌ Erro ao restaurar sessões:", error);
  });
});
//httpServer.listen(PORT, () => {
///  console.log(`🚀 Bot rodando na porta ${PORT}`);
//});

//=======================================================================================
/*import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { startWhatsApp, listarSessoesWhatsApp } from "./src/service/whatsapp/whatsapp.service.js";

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
*/
