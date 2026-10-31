import { obterConfiguracao } from "../../lib/obterConfiguraca.js";
import type { AgendamentoRetornado } from "./consultarAgendamentos.js";

export async function consultarAgendamentosBarbearia(
  barbeariaId: string,
): Promise<AgendamentoRetornado[]> {
  const { urlHost, apiUrl } = obterConfiguracao();

  if (!barbeariaId) {
    throw new Error("ID da barbearia não informado.");
  }

  const response = await fetch(
    `${apiUrl}/agendamento/${encodeURIComponent(barbeariaId)}`,
  );

  if (!response.ok) {
    throw new Error(
      `Erro ao consultar agendamentos da barbearia ${barbeariaId}: HTTP ${response.status}`,
    );
  }

  const resultado: unknown = await response.json();

  if (!Array.isArray(resultado)) {
    throw new Error(
      "A API não retornou uma lista de agendamentos da barbearia.",
    );
  }

  return resultado as AgendamentoRetornado[];
}
