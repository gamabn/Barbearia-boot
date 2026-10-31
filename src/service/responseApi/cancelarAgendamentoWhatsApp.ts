import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

export async function cancelarAgendamentoWhatsApp(
  agendamentoId: string,
  barbeariaId: string,
  clientePhone: string,
): Promise<void> {
  const { urlHost, apiUrl } = obterConfiguracao();
  const token = process.env.BOT_SERVICE_TOKEN;

  if (!token) {
    throw new Error("BOT_SERVICE_TOKEN não configurado.");
  }

  if (!agendamentoId || !barbeariaId || !clientePhone) {
    throw new Error("Dados obrigatórios para cancelamento não informados.");
  }

  const response = await fetch(
    `${apiUrl.replace(/\/$/, "")}/whatsapp/agendamentos/${encodeURIComponent(barbeariaId)}/${encodeURIComponent(agendamentoId)}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientePhone,
      }),
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`Erro ao cancelar agendamento: HTTP ${response.status}`);
  }
}
