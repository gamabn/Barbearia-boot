import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

export type AgendamentoRetornado = {
  id: string;
  barber_id: string;
  barbearia_id?: string;
  date_agend: string;
  date_finish: string | null;
  status: string;
  duration_total: unknown;
  total_price: number | string;
  tipo: "AGENDAMENTO" | "FILA";
  client_name: string;
  client_phone: string;
  barber_name: string;
  services: {
    id: string | null;
    name: string | null;
    price: number | string | null;
    duration: unknown;
  }[];
};

export async function consultarAgendamentos(
  client_phone: string,
  barbeariaId: string,
): Promise<AgendamentoRetornado[]> {
  const { urlHost } = obterConfiguracao();

  if (!client_phone || !barbeariaId) {
    throw new Error("Telefone ou ID da barbearia não informado.");
  }

  const response = await fetch(
    `${urlHost}/agend/${encodeURIComponent(client_phone)}?barbeariaId=${encodeURIComponent(barbeariaId)}`,
  );

  if (!response.ok) {
    throw new Error(`Erro ao consultar agendamentos: HTTP ${response.status}`);
  }

  const resultado: unknown = await response.json();

  if (!Array.isArray(resultado)) {
    throw new Error("A API não retornou uma lista de agendamentos.");
  }

  return resultado as AgendamentoRetornado[];
}
