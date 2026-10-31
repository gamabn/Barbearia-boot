import type { Barbeiro, Servico } from "../../type/type.js";
import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

export async function calcularHorariosDisponiveis({ data, barbeiro, servico, barbeariaId }: {
  data: string;
  barbeiro: Barbeiro;
  servico: Servico;
  barbeariaId: string;
}): Promise<string[]> {
  if (!barbeariaId || !barbeiro.id || !servico.id) throw new Error("Seleção incompleta.");
  const { urlHost } = obterConfiguracao();
  const query = new URLSearchParams({
    barber_id: barbeiro.id, date: data, service_ids: servico.id, step_minutes: "30",
  });
  
  const response = await fetch(
    `${urlHost.replace(/\/$/, "")}/disponibilidade/${encodeURIComponent(barbeariaId)}?${query}`,
    { signal: AbortSignal.timeout(8000), credentials: "omit" },
  );

  if (!response.ok) throw new Error(`Erro ao consultar disponibilidade: HTTP ${response.status}`);
  const result = await response.json() as {
    date: string; timeZone: string; slots: { start_at: string; end_at: string }[];
  };

  if (result.date !== data || result.timeZone !== "America/Sao_Paulo" || !Array.isArray(result.slots)) {
    throw new Error("Resposta de disponibilidade inválida.");
  }

  const format = new Intl.DateTimeFormat("pt-BR", {
    timeZone: result.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });

  return result.slots.map((slot) => format.format(new Date(slot.start_at)));
}
