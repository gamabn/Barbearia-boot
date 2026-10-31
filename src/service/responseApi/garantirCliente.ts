import { obterConfiguracao } from "../../lib/obterConfiguraca.js";

type Cliente = {
  id?: string;
  client_id?: string;
  name: string;
  client_phone: string;
  barbearia_id?: string;
};

export async function garantirCliente(
  telefone: string,
  nome: string,
  barbeariaId: string,
): Promise<Cliente> {
  const { apiUrl } = obterConfiguracao();

  if (!barbeariaId) {
    throw new Error("Não foi possível identificar a barbearia.");
  }

  const telefoneLimpo = telefone.replace(/\D/g, "");

  if (!telefoneLimpo) {
    throw new Error("Telefone do cliente inválido.");
  }

  // 1. Consulta o cliente na barbearia correta
  const urlConsulta =
    `${apiUrl}/client_whatsapp/` +
    `${encodeURIComponent(barbeariaId)}/` +
    `${encodeURIComponent(telefoneLimpo)}`;

  const resposta = await fetch(urlConsulta);

  if (resposta.status === 403) {
    throw new Error(
      "ASSINATURA_INATIVA: Esta barbearia está temporariamente indisponível.",
    );
  }

  let clienteExistente: Cliente | null = null;

  if (resposta.ok) {
    clienteExistente = (await resposta.json()) as Cliente | null;
  } else if (resposta.status === 404) {
    console.log(`🔎 Cliente não encontrado na barbearia ${barbeariaId}.`);
  } else {
    throw new Error(`Erro ao consultar cliente: HTTP ${resposta.status}`);
  }

  // 2. Cliente encontrado
  if (clienteExistente) {
    if (clienteExistente.barbearia_id !== barbeariaId) {
      throw new Error("Cliente pertence a outra barbearia.");
    }

    if (!clienteExistente.id && !clienteExistente.client_id) {
      throw new Error("Consulta não retornou o ID do cliente.");
    }

    console.log("✅ Cliente encontrado:", clienteExistente.id);

    return clienteExistente;
  }

  // 3. Cliente não encontrado: cadastra na barbearia correta
  console.log(`🆕 Cadastrando cliente na barbearia ${barbeariaId}`);

  const cadastro = await fetch(`${apiUrl}/client`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: nome.trim() || "Cliente WhatsApp",
      client_phone: telefoneLimpo,
      barbearia_id: barbeariaId,
    }),
  });

  const corpo = await cadastro.text();

  if (cadastro.status === 403) {
    throw new Error(
      "ASSINATURA_INATIVA: Esta barbearia está temporariamente indisponível.",
    );
  }

  if (!cadastro.ok) {
    throw new Error(
      `Erro ao cadastrar cliente: HTTP ${cadastro.status}. ${corpo}`,
    );
  }

  let novoCliente: Cliente;

  try {
    novoCliente = JSON.parse(corpo) as Cliente;
  } catch {
    throw new Error("Resposta inválida ao cadastrar cliente.");
  }

  if (!novoCliente.id && !novoCliente.client_id) {
    throw new Error("Cadastro não retornou o ID do cliente.");
  }

  if (novoCliente.barbearia_id !== barbeariaId) {
    throw new Error("Cadastro não confirmou a barbearia correta.");
  }

  console.log(
    `✅ Cliente cadastrado na barbearia ${barbeariaId}:`,
    novoCliente.id,
  );

  return novoCliente;
}
