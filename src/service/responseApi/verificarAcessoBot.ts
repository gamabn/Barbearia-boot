import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

export async function verificarAcessoBot(
  barbeariaId: string,
): Promise<boolean> {
  const { apiUrl, urlHost } = obterConfiguracao();
  // const apiUrl = process.env.API_URL;
  const token = process.env.BOT_SERVICE_TOKEN;

  if (!apiUrl || !token) {
    throw new Error("Configuração de acesso ao backend ausente.");
  }

  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/bot/access/${encodeURIComponent(barbeariaId)}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`Erro ao verificar assinatura: HTTP ${response.status}`);
  }

  const data: { allowed: boolean } = await response.json();

  return data.allowed === true;
}
