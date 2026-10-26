import { obterConfiguracao } from "../../lib/obterConfiguraca.js";
import type { Agendamento } from "../../type/type.js";

interface AgendarParams {
  data: Agendamento;
  barbeariaId: string;
}

export async function Agendar({ data, barbeariaId }: AgendarParams) {
  const { urlHost } = obterConfiguracao();

  if (!barbeariaId) {
    throw new Error("Não foi possível identificar a barbearia.");
  }

  if (!data.barber_id || !data.date_agend || !data.service_ids?.length) {
    throw new Error("Informe o barbeiro, a data e pelo menos um serviço.");
  }

  if (data.tipo !== "FILA" && !data.client_id) {
    throw new Error("Não foi possível identificar o cliente.");
  }

  console.log("📅 Agendamento recebido:", {
    barbeariaId,
    clienteId: data.client_id,
    barbeiroId: data.barber_id,
    servicos: data.service_ids,
    data: data.date_agend,
  });

  const response = await fetch(`${urlHost}/agend`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...data,
      barbearia_id: barbeariaId,
    }),
  });

  const resultado = await response.json().catch(() => null);

  if (resultado?.barbearia_id !== barbeariaId) {
    console.error("❌ Barbearia diferente:", {
      esperada: barbeariaId,
      recebida: resultado?.barbearia_id,
    });

    throw new Error("O agendamento retornou uma barbearia diferente.");
  }
  if (!response.ok) {
    throw new Error(
      resultado?.message ??
        resultado?.error ??
        "Não foi possível realizar o agendamento.",
    );
  }

  console.log("✅ Agendamento criado:", {
    barbeariaId,
    resultado,
  });

  return resultado;
}
