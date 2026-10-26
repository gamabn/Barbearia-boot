import {
  type Barbeiro,
  //type Duracao,
  type Servico,
  type Sessao,
  // type Agendamento,
} from "../type/type.js";
//import { obterConfiguracao } from "../lib/obterConfiguraca.js";
import { consultarBarbeiros } from "./responseApi/consultarBarbeiros.js";
import { consultarServicos } from "./responseApi/consultarServiços.js";
import { formatarDuracao, formatarPreco } from "./responseApi/format.js";
import { calcularHorariosDisponiveis } from "./responseApi/calcularHorariosDisponiveis.js";
import { Agendar } from "./responseApi/agendarService.js";
//import { consultarAgendamentos } from "./responseApi/consultarAgendamentos.js";
import { consultarAgendamentosWhatsApp } from "./responseApi/consultarAgendamentosWhatsApp.js";
//import { Barbearia } from "./atendimento.service.js";
///export { Barbearia } from "./responseApi/consultarBarbearia.js"
//import { type BarbeariaType } from "../type/type.js";

const sessoes = new Map<string, Sessao>();

//const consultarBarbearia = new Barbearia()

//const barbeiro: BarbeariaType = consultarBarbearia.consultar(barbeariaId)

function menuPrincipal(nomeBarbearia: string): string {
  return [
    `Olá! 👋 Bem-vindo à ${nomeBarbearia}!`,
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
  clienteId: string | undefined,
  clientePhone: string | undefined,
  barbeariaId: string,
  nomeBarbearia: string,
): Promise<string> {
  const texto = mensagem.trim();

  const normalizado = texto.toLowerCase();

  //const sessao = sessoes.get(telefone);

  const chaveSessao = `${barbeariaId}:${telefone}`;

  const sessao = sessoes.get(chaveSessao);

  const clienteIdAtual = clienteId ?? sessao?.clienteId;

  if (sessao && clienteIdAtual) {
    sessao.clienteId = clienteIdAtual;
    sessoes.set(chaveSessao, sessao);
  }

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu)$/i.test(normalizado)) {
    sessoes.set(chaveSessao, {
      etapa: "menu",
      ...(clienteIdAtual ? { clienteId: clienteIdAtual } : {}),
      barbeiros: [],
      servicos: [],
    });

    return menuPrincipal(nomeBarbearia);
  }

  if (normalizado === "barbeiros") {
    try {
      const barbeiros = await consultarBarbeiros(barbeariaId);

      if (barbeiros.length === 0) {
        return "Não encontrei barbeiros cadastrados. Digite MENU para voltar.";
      }

      sessoes.set(chaveSessao, {
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

  if (
    (normalizado === "1" || normalizado === "2") &&
    (!sessao || sessao.etapa === "menu")
  ) {
    try {
      const barbeiros = await consultarBarbeiros(barbeariaId);

      if (barbeiros.length === 0) {
        return "Não há barbeiros cadastrados nesta barbearia.";
      }

      sessoes.set(chaveSessao, {
        etapa: "escolher_barbeiro",
        ...(clienteIdAtual ? { clienteId: clienteIdAtual } : {}),
        modo: normalizado === "1" ? "agendamento" : "consulta",
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

  // if (normalizado === "3" && (!sessao || sessao.etapa === "menu")) {
  // return "📅 A consulta dos seus agendamentos será conectada na próxima etapa.\n\nDigite MENU para voltar.";
  //}

  //if (normalizado === "3" && (!sessao || sessao.etapa === "menu")) {
  //  return "❌ O cancelamento será conectado ao sistema na próxima etapa.\n\nDigite MENU para voltar.";
  // }

  if (normalizado === "5" && (!sessao || sessao.etapa === "menu")) {
    sessoes.set(chaveSessao, {
      ...(clienteIdAtual ? { clienteId: clienteIdAtual } : {}),
      etapa: "atendente",
      barbeiros: [],
      servicos: [],
    });

    return "👋 Você solicitou atendimento humano. Digite MENU para voltar.";
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
      const servicos = await consultarServicos(barbeiro.id, barbeariaId);

      sessao.barbeiro = barbeiro;
      sessao.servicos = servicos;
      sessao.etapa = "escolher_servico";
      sessoes.set(chaveSessao, sessao);

      return listarServicos(barbeiro, servicos);
    } catch (erro) {
      console.error("Erro ao consultar serviços:", erro);
      return "Não consegui consultar os serviços desse barbeiro. Tente novamente.";
    }
  }

  if (sessao.etapa === "escolher_servico" && normalizado === "barbeiros") {
    try {
      const barbeiros = await consultarBarbeiros(barbeariaId);

      sessoes.set(chaveSessao, {
        etapa: "escolher_barbeiro",
        ...(clienteIdAtual ? { clienteId: clienteIdAtual } : {}),
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

    {
      /* if (sessao.modo === "agendamento") {
      return [
        `Você escolheu ${servico.name}.`,
        `💰 Valor: ${formatarPreco(servico.price)}`,
        `⏱️ Duração: ${formatarDuracao(servico.duration)}`,
        "",
        "📅 Para qual dia você deseja agendar?",
        "Digite a data no formato DD/MM/AAAA.",
        "Exemplo: 12/10/2026",
        "",
        "Digite MENU para voltar.",
      ].join("\n");
    }*/
    }

    if (sessao.modo === "agendamento") {
      sessao.servicoSelecionado = servico;
      sessao.etapa = "escolher_data";

      sessoes.set(chaveSessao, sessao);

      return [
        `Você escolheu ${servico.name}.`,
        `💰 Valor: ${formatarPreco(servico.price)}`,
        `⏱️ Duração: ${formatarDuracao(servico.duration)}`,
        "",
        "📅 Para qual dia você deseja agendar?",
        "Digite a data no formato DD/MM/AAAA.",
        "Exemplo: 12/10/2026",
        "",
        "Digite MENU para voltar.",
      ].join("\n");
    }

    return [
      `💈 ${sessao.barbeiro?.name ?? "Barbeiro selecionado"}`,
      `✂️ Serviço: ${servico.name}`,
      `💰 Valor: ${formatarPreco(servico.price)}`,
      `⏱️ Duração: ${formatarDuracao(servico.duration)}`,
      "",
      "Digite BARBEIROS para consultar outro profissional ou MENU para voltar.",
    ].join("\n");
  }

  if (sessao.etapa === "escolher_data") {
    //const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const partes = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!partes) {
      return "Informe a data no formato DD/MM/AAAA. Exemplo: 12/10/2026.";
    }

    const dia = Number(partes[1]);
    const mes = Number(partes[2]);
    const ano = Number(partes[3]);

    const data = `${partes[3]}-${partes[2]}-${partes[1]}`;
    const dataValidada = new Date(`${data}T12:00:00-03:00`);

    if (
      dataValidada.getFullYear() !== ano ||
      dataValidada.getMonth() + 1 !== mes ||
      dataValidada.getDate() !== dia
    ) {
      return "Essa data não é válida. Informe outra data no formato DD/MM/AAAA.";
    }

    if (!sessao.barbeiro || !sessao.servicoSelecionado) {
      sessoes.set(chaveSessao, {
        etapa: "menu",
        barbeiros: [],
        servicos: [],
      });

      return "Vamos recomeçar seu atendimento. Digite MENU.";
    }

    try {
      const horarios = await calcularHorariosDisponiveis({
        data,
        barbeiro: sessao.barbeiro,
        servico: sessao.servicoSelecionado,
        barbeariaId,
      });

      if (horarios.length === 0) {
        return [
          "😕 Não encontrei horários disponíveis nessa data.",
          "Informe outra data no formato DD/MM/AAAA.",
        ].join("\n");
      }

      sessao.dataAgendamento = data;
      sessao.horariosDisponiveis = horarios;
      sessao.etapa = "escolher_horario";

      sessoes.set(chaveSessao, sessao);

      const listaHorarios: string[] = [];

      for (let i = 0; i < horarios.length; i += 4) {
        listaHorarios.push(horarios.slice(i, i + 4).join(" | "));
      }

      return [
        `📅 Data: ${partes[1]}/${partes[2]}/${partes[3]}`,
        `💈 Barbeiro: ${sessao.barbeiro.name}`,
        `✂️ Serviço: ${sessao.servicoSelecionado.name}`,
        "",
        "🕒 Horários disponíveis:",
        ...listaHorarios,
        "",
        "Digite o horário desejado, por exemplo: 09:30.",
        "Digite MENU para voltar.",
      ].join("\n");
    } catch (erro) {
      console.error("Erro ao calcular horários:", erro);
      return "Não consegui consultar os horários agora. Tente novamente em instantes.";
    }
  }

  if (sessao.etapa === "escolher_horario") {
    const horarioInformado = texto.match(/^(\d{1,2}):(\d{2})$/);

    if (!horarioInformado) {
      return "Informe um horário válido, como 09:30.";
    }

    const horas = Number(horarioInformado[1]);
    const minutos = Number(horarioInformado[2]);

    if (horas > 23 || minutos > 59) {
      return "Esse horário é inválido. Escolha um dos horários disponíveis.";
    }

    const horario = `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;

    if (!sessao.horariosDisponiveis?.includes(horario)) {
      return [
        "Esse horário não está disponível para o serviço escolhido.",
        "Escolha um dos horários que enviei anteriormente.",
      ].join("\n");
    }

    sessao.horarioAgendamento = horario;
    sessao.etapa = "confirmar_agendamento";

    sessoes.set(chaveSessao, sessao);

    const dataFormatada = sessao.dataAgendamento
      ?.split("-")
      .reverse()
      .join("/");

    return [
      "Confira os dados do seu agendamento:",
      "",
      `💈 Barbeiro: ${sessao.barbeiro?.name}`,
      `✂️ Serviço: ${sessao.servicoSelecionado?.name}`,
      `📅 Data: ${dataFormatada}`,
      `🕒 Horário: ${horario}`,
      `💰 Valor: ${formatarPreco(sessao.servicoSelecionado!.price)}`,
      "",
      "Digite SIM para confirmar agendamento.",
      "Digite MENU para voltar.",
    ].join("\n");
  }

  if (sessao.etapa === "confirmar_agendamento") {
    if (normalizado === "não" || normalizado === "nao") {
      sessoes.set(chaveSessao, {
        etapa: "menu",
        ...(sessao.clienteId ? { clienteId: sessao.clienteId } : {}),
        barbeiros: [],
        servicos: [],
      });

      return "Agendamento cancelado. Nenhum horário foi reservado.\n\nDigite MENU para ver as opções.";
    }

    if (normalizado !== "sim") {
      return "Deseja confirmar o agendamento?\n\nResponda SIM para confirmar ou NÃO para desistir.";
    }

    const clienteIdFinal = clienteIdAtual ?? sessao.clienteId;
    const barbeiro = sessao.barbeiro;
    const servico = sessao.servicoSelecionado;
    const data = sessao.dataAgendamento;
    const horario = sessao.horarioAgendamento;

    if (
      !clienteIdFinal ||
      !barbeiro ||
      !servico ||
      !data ||
      !horario ||
      !barbeariaId
    ) {
      console.error("Dados incompletos para confirmar agendamento:", {
        clienteId: Boolean(clienteIdFinal),
        barbeiro: Boolean(barbeiro),
        servico: Boolean(servico),
        data: Boolean(data),
        horario: Boolean(horario),
      });

      return "Não consegui confirmar porque faltam dados do agendamento. Digite MENU e tente novamente.";
    }

    try {
      const resultado = await Agendar({
        barbeariaId,
        data: {
          client_id: clienteIdFinal,
          barber_id: barbeiro.id,
          date_agend: `${data}T${horario}:00-03:00`,
          service_ids: [servico.id],
          tipo: "AGENDAMENTO",
        },
      });

      console.log("✅ Agendamento criado:", resultado);

      sessoes.set(chaveSessao, {
        etapa: "menu",
        clienteId: clienteIdFinal,
        barbeiros: [],
        servicos: [],
      });

      return [
        "✅ Agendamento confirmado com sucesso!",
        "",
        `💈 Barbeiro: ${barbeiro.name}`,
        `✂️ Serviço: ${servico.name}`,
        `📅 Data: ${data.split("-").reverse().join("/")}`,
        `🕒 Horário: ${horario}`,
        `💰 Valor: ${formatarPreco(servico.price)}`,
        "",
        "Obrigado por escolher nossa barbearia! 😊",
        "Digite MENU para ver as opções.",
      ].join("\n");
    } catch (erro) {
      console.error("❌ Erro ao confirmar agendamento:", erro);

      const mensagem =
        erro instanceof Error
          ? erro.message
          : "Erro desconhecido ao realizar agendamento.";

      return `Não consegui confirmar o agendamento: ${mensagem}\n\nO horário não foi confirmado. Você pode tentar SIM novamente ou digitar MENU para sair.`;
    }
  }

  if (normalizado === "3" && sessao?.etapa === "menu") {
    if (!clientePhone) {
      return "Não consegui identificar seu telefone. Tente novamente.";
    }
    console.log("telefone do cliente", clientePhone);
    try {
      const agendamentosCliente = await consultarAgendamentosWhatsApp(
        clientePhone,
        barbeariaId,
      );

      if (agendamentosCliente.length === 0) {
        return "📅 Você não possui agendamentos cadastrados.\n\nDigite MENU para ver as opções disponíveis.";
      }

      const lista = agendamentosCliente.map((agend, index) => {
        const data = new Date(agend.date_agend);

        const dataFormatada = data.toLocaleDateString("pt-BR", {
          timeZone: "America/Sao_Paulo",
        });

        const horarioFormatado = data.toLocaleTimeString("pt-BR", {
          timeZone: "America/Sao_Paulo",
          hour: "2-digit",
          minute: "2-digit",
        });

        const servicos = Array.isArray(agend.services)
          ? agend.services.map((servico) => servico.name).join(", ")
          : "Serviço não informado";

        return [
          `📌 Agendamento ${index + 1}`,
          `📅 Data: ${dataFormatada}`,
          `🕒 Horário: ${horarioFormatado}`,
          `💈 Barbeiro: ${agend.barber_name}`,
          `✂️ Serviço: ${servicos}`,
          `💰 Valor: ${formatarPreco(agend.total_price)}`,
          `📍 Status: ${agend.status}`,
        ].join("\n");
      });

      return [
        "📋 Seus agendamentos:",
        "",
        lista.join("\n\n"),
        "",
        "Digite MENU para voltar.",
      ].join("\n");
    } catch (erro) {
      console.error("Erro ao consultar agendamentos:", erro);

      return "Não consegui consultar seus agendamentos agora. Tente novamente em instantes.";
    }
  }

  return "Digite MENU para ver as opções disponíveis.";
}
