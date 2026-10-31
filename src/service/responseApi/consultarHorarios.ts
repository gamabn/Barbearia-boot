import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

export type HorarioFuncionamento = {
  id: string;
  barbearia_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

export async function consultarHorarios(
  barbeariaId: string,
): Promise<HorarioFuncionamento[]> {
  const { urlHost, apiUrl } = obterConfiguracao();

  if (!barbeariaId) {
    throw new Error("ID da barbearia não informado.");
  }

  const response = await fetch(
    `${apiUrl}/horarios/${encodeURIComponent(barbeariaId)}`,
  );

  if (!response.ok) {
    throw new Error(`Erro ao consultar horários: HTTP ${response.status}`);
  }

  const resultado: unknown = await response.json();

  if (!Array.isArray(resultado)) {
    throw new Error("A API não retornou uma lista de horários.");
  }

  return resultado as HorarioFuncionamento[];
}
