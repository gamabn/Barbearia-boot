import {
  type Barbeiro,
  type Duracao,
  type Servico,
  type Sessao,
} from "../type/type.js";
import { obterConfiguracao } from "../lib/obterConfiguraca.js";
const sessoes = new Map<string, Sessao>();

async function consultarBarbeiros(): Promise<Barbeiro[]> {
  const { apiUrl, barbeariaId, urlHost } = obterConfiguracao();

  const resposta = await fetch(`${urlHost}/barber/many/${barbeariaId}`);

  if (!resposta.ok) {
    throw new Error(`Erro ao consultar barbeiros: HTTP ${resposta.status}`);
  }

  return (await resposta.json()) as Barbeiro[];
}

async function consultarServicos(barbeiroId: string): Promise<Servico[]> {
  const { apiUrl } = obterConfiguracao();

  const resposta = await fetch(`${apiUrl}/service/${barbeiroId}`);

  if (!resposta.ok) {
    throw new Error(`Erro ao consultar serviços: HTTP ${resposta.status}`);
  }

  return (await resposta.json()) as Servico[];
}

function formatarDuracao(duracao: Duracao): string {
  const minutos = (duracao.hours ?? 0) * 60 + (duracao.minutes ?? 0);

  if (minutos === 0) return "Duração não informada";
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
}

function formatarPreco(preco: string | number): string {
  return Number(preco).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function menuPrincipal(): string {
  return [
    "Olá! 👋 Bem-vindo à nossa barbearia!",
    "",
    "Como posso ajudar?",
    "",
    "1️⃣ Agendar horário",
    "2️⃣ Consultar serviços e preços",
    "3️⃣ Consultar meus agendamentos",
    "4️⃣ Cancelar agendamento",
    "5️⃣ Falar com um atendente",
    "",
    "Digite o número da opção desejada.",
  ].join("\n");
}

function listarBarbeiros(barbeiros: Barbeiro[] | undefined): string {
  return [
    "💈 Escolha o barbeiro:",
    "",
    ...(barbeiros ?? []).map(
      (barbeiro, indice) => `${indice + 1}️⃣ ${barbeiro.name}`,
    ),
    "",
    "Digite o número do profissional ou MENU para voltar.",
  ].join("\n");
}

function listarServicos(
  barbeiro: Barbeiro | undefined,
  servicos: Servico[],
): string {
  if (servicos.length === 0) {
    return [
      `Olá! No momento, não encontrei serviços cadastrados para ${barbeiro?.name}.`,
      "",
      "Digite MENU para voltar.",
    ].join("\n");
  }

  return [
    `✂️ Serviços de ${barbeiro?.name}:`,
    "",
    ...servicos.map(
      (servico, indice) =>
        `${indice + 1}️⃣ ${servico.name}\n   💰 ${formatarPreco(servico.price)}\n   ⏱️ ${formatarDuracao(servico.duration)}`,
    ),
    "",
    "Digite o número de um serviço para selecioná-lo.",
    "Digite BARBEIROS para escolher outro profissional ou MENU para voltar.",
  ].join("\n");
}

export async function processarMensagem(
  telefone: string,
  mensagem: string,
): Promise<string> {
  const texto = mensagem.trim();
  const normalizado = texto.toLowerCase();
  let sessao = sessoes.get(telefone);

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu)$/i.test(normalizado)) {
    sessoes.set(telefone, {
      etapa: "menu",
      barbeiros: [],
      servicos: [],
    });

    return menuPrincipal();
  }

  if (normalizado === "barbeiros") {
    try {
      const barbeiros = await consultarBarbeiros();

      if (barbeiros.length === 0) {
        return "Não encontrei barbeiros cadastrados. Digite MENU para voltar.";
      }

      sessoes.set(telefone, {
        etapa: "escolher_barbeiro",
        barbeiros,
        servicos: [],
      });

      return listarBarbeiros(barbeiros);
    } catch (erro) {
      console.error("Erro ao consultar barbeiros:", erro);
      return "Não consegui consultar os barbeiros agora. Tente novamente em instantes.";
    }
  }

  if (normalizado === "1" || normalizado === "2") {
    try {
      const barbeiros = await consultarBarbeiros();

      if (barbeiros.length === 0) {
        return "Não há barbeiros cadastrados nesta barbearia.";
      }

      sessoes.set(telefone, {
        etapa: "escolher_barbeiro",
        barbeiros,
        servicos: [],
      });

      const cabecalho =
        normalizado === "1"
          ? "📅 Vamos iniciar seu agendamento!"
          : "💈 Consulte os serviços e preços.";

      return `${cabecalho}\n\n${listarBarbeiros(barbeiros)}`;
    } catch (erro) {
      console.error("Erro ao consultar barbeiros:", erro);
      return "Não consegui acessar a lista de barbeiros. Tente novamente em instantes.";
    }
  }

  if (normalizado === "3") {
    return "📅 A consulta dos seus agendamentos será conectada na próxima etapa.\n\nDigite MENU para voltar.";
  }

  if (normalizado === "4") {
    return "❌ O cancelamento será conectado ao sistema na próxima etapa.\n\nDigite MENU para voltar.";
  }

  if (normalizado === "5") {
    sessoes.set(telefone, {
      etapa: "atendente",
      barbeiros: [],
      servicos: [],
    });

    return "👋 Você solicitou atendimento humano. A integração para encaminhar a conversa será implementada na próxima etapa.";
  }

  if (!sessao) {
    return "Desculpe, não entendi. Digite MENU para ver as opções.";
  }

  if (sessao.etapa === "atendente") {
    return "Sua solicitação de atendimento humano está registrada nesta conversa de teste. Digite MENU para voltar.";
  }

  if (sessao.etapa === "escolher_barbeiro") {
    const indice = Number(texto) - 1;

    if (
      !Number.isInteger(indice) ||
      indice < 0 ||
      indice >= sessao.barbeiros.length
    ) {
      return "Escolha um número válido da lista de barbeiros ou digite MENU para voltar.";
    }

    const barbeiro = sessao.barbeiros[indice];

    if (!barbeiro) {
      return "Escolha um número válido da lista de barbeiros ou digite MENU para voltar.";
    }

    try {
      const servicos = await consultarServicos(barbeiro.id);

      sessao.barbeiro = barbeiro;
      sessao.servicos = servicos;
      sessao.etapa = "escolher_servico";
      sessoes.set(telefone, sessao);

      return listarServicos(barbeiro, servicos);
    } catch (erro) {
      console.error("Erro ao consultar serviços:", erro);
      return "Não consegui consultar os serviços desse barbeiro. Tente novamente.";
    }
  }

  if (sessao.etapa === "escolher_servico" && normalizado === "barbeiros") {
    try {
      const barbeiros = await consultarBarbeiros();

      sessoes.set(telefone, {
        etapa: "escolher_barbeiro",
        barbeiros,
        servicos: [],
      });

      return listarBarbeiros(barbeiros);
    } catch (erro) {
      console.error("Erro ao consultar barbeiros:", erro);
      return "Não consegui consultar os barbeiros agora. Tente novamente.";
    }
  }

  if (sessao.etapa === "escolher_servico") {
    const indice = Number(texto) - 1;

    if (
      !Number.isInteger(indice) ||
      indice < 0 ||
      indice >= sessao.servicos.length
    ) {
      return "Escolha o número de um serviço da lista, digite BARBEIROS para trocar de profissional ou MENU para voltar.";
    }

    const servico = sessao.servicos[indice];

    if (!servico) {
      return "Serviço não encontrado. Digite MENU para recomeçar.";
    }

    return [
      `Você escolheu ${servico.name}.`,
      `💰 Valor: ${formatarPreco(servico.price)}`,
      `⏱️ Duração: ${formatarDuracao(servico.duration)}`,
      "",
      "A consulta de serviços já está funcionando. Na próxima etapa, vamos consultar os horários disponíveis e concluir o agendamento.",
      "",
      "Digite MENU para voltar.",
    ].join("\\n");
  }

  return "Digite MENU para ver as opções disponíveis.";
}
