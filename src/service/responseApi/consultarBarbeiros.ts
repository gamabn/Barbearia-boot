/*import { type Barbeiro } from "../../type/type.js";
import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

export async function consultarBarbeiros(): Promise<Barbeiro[]> {
  const { barbeariaId, urlHost } = obterConfiguracao();

  const resposta = await fetch(`${urlHost}/barber/many/${barbeariaId}`);

  if (!resposta.ok) {
    throw new Error(`Erro ao consultar barbeiros: HTTP ${resposta.status}`);
  }

  return (await resposta.json()) as Barbeiro[];
}*/

import { type Barbeiro } from "../../type/type.js";
import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

export async function consultarBarbeiros(
  barbeariaId: string,
): Promise<Barbeiro[]> {
  const { urlHost } = obterConfiguracao();

  if (!barbeariaId) {
    throw new Error("ID da barbearia não informado.");
  }

  const resposta = await fetch(
    `${urlHost}/barber/many/${encodeURIComponent(barbeariaId)}`,
  );

  if (!resposta.ok) {
    throw new Error(
      `Erro ao consultar barbeiros da barbearia ${barbeariaId}: HTTP ${resposta.status}`,
    );
  }

  return (await resposta.json()) as Barbeiro[];
}
