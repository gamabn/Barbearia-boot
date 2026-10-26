
import { obterConfiguracao } from "../../lib/obterConfiguraca.js";
import type { AgendamentoRetornado } from "./consultarAgendamentos.js";

export async function consultarAgendamentosWhatsApp(
  clientPhone: string,
  barbeariaId: string,
): Promise<AgendamentoRetornado[]> {
  const { urlHost } = obterConfiguracao();

  if (!clientPhone || !barbeariaId) {
    throw new Error("Telefone e barbearia são obrigatórios.");
  }

  const response = await fetch(
    `${urlHost}/whatsapp/agendamentos/${encodeURIComponent(barbeariaId)}/${encodeURIComponent(clientPhone)}`,
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar agendamentos: HTTP ${response.status}`,
    );
  }

  const resultado: unknown = await response.json();

  if (!Array.isArray(resultado)) {
    throw new Error("Resposta inválida ao consultar agendamentos.");
  }

  return resultado as AgendamentoRetornado[];
}
