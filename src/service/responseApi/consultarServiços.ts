/*import { obterConfiguracao } from "../../lib/obterConfiguraca.js";
import { type Servico } from "../../type/type.js";

export async function consultarServicos(
  barbeiroId: string,
): Promise<Servico[]> {
  const { urlHost } = obterConfiguracao();

  const resposta = await fetch(`${urlHost}/service/${barbeiroId}`);

  if (!resposta.ok) {
    throw new Error(`Erro ao consultar serviços: HTTP ${resposta.status}`);
  }

  return (await resposta.json()) as Servico[];
}*/

import { obterConfiguracao } from "../../lib/obterConfiguraca.js";
import { type Servico } from "../../type/type.js";

export async function consultarServicos(
  barbeiroId: string,
  barbeariaId: string,
): Promise<Servico[]> {
  const { urlHost } = obterConfiguracao();

  if (!barbeiroId || !barbeariaId) {
    throw new Error("ID do barbeiro ou da barbearia não informado.");
  }

  const resposta = await fetch(
    `${urlHost}/service/${encodeURIComponent(barbeiroId)}`,
  );

  if (!resposta.ok) {
    throw new Error(
      `Erro ao consultar serviços da barbearia ${barbeariaId}: HTTP ${resposta.status}`,
    );
  }

  return (await resposta.json()) as Servico[];
}
