import type { Barbeiro, Servico } from "../../type/type.js";
//import { consultarAgendamentos } from "./consultarAgendamentos.js";
import { consultarHorarios } from "./consultarHorarios.js";
import { consultarAgendamentosBarbearia } from "./consultarAgendamentosBarbearia.js";

function converterDuracaoMinutos(duracao: unknown): number {
  if (typeof duracao === "number") {
    return duracao;
  }

  if (typeof duracao === "string") {
    const partes = duracao.match(/^(\d+):(\d{2}):(\d{2})$/);

    if (partes) {
      return (
        Number(partes[1]) * 60 + Number(partes[2]) + Number(partes[3]) / 60
      );
    }

    return 0;
  }

  if (typeof duracao === "object" && duracao !== null) {
    const valor = duracao as {
      hours?: number;
      minutes?: number;
    };

    return (valor.hours ?? 0) * 60 + (valor.minutes ?? 0);
  }

  return 0;
}

function minutosDoHorario(horario: string): number {
  const partes = horario.split(":");
  const horas = Number(partes[0]);
  const minutos = Number(partes[1]);

  if (
    partes.length < 2 ||
    !Number.isFinite(horas) ||
    !Number.isFinite(minutos)
  ) {
    throw new Error(`Horário inválido: ${horario}`);
  }

  return horas * 60 + minutos;
}

function formatarHorario(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(resto).padStart(2, "0")}`;
}

function dataLocalISO(data: Date): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const obter = (tipo: string) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "";

  return `${obter("year")}-${obter("month")}-${obter("day")}`;
}

function converterDataParaInstante(data: string, minutos: number): number {
  const horario = formatarHorario(minutos);
  return new Date(`${data}T${horario}:00-03:00`).getTime();
}

export async function calcularHorariosDisponiveis({
  data,
  barbeiro,
  servico,
  barbeariaId,
}: {
  data: string;
  barbeiro: Barbeiro;
  servico: Servico;
  barbeariaId: string;
}): Promise<string[]> {
  if (!barbeariaId) {
    throw new Error("ID da barbearia não informado.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    throw new Error("Informe a data no formato AAAA-MM-DD.");
  }

  const dataValidada = new Date(`${data}T12:00:00-03:00`);

  if (
    Number.isNaN(dataValidada.getTime()) ||
    dataLocalISO(dataValidada) !== data
  ) {
    throw new Error("A data informada é inválida.");
  }

  const duracaoServico = converterDuracaoMinutos(servico.duration);

  if (duracaoServico <= 0) {
    throw new Error("Não foi possível identificar a duração do serviço.");
  }

  const [horarios, agendamentos] = await Promise.all([
    consultarHorarios(barbeariaId),
    // consultarAgendamentos(),
    consultarAgendamentosBarbearia(barbeariaId),
  ]);

  // JavaScript: domingo = 0; segunda = 1; ... sábado = 6.
  const diaDaSemana = dataValidada.getDay();

  //if (diaDaSemana === 0) {
  // return [];
  //}

  const expediente = horarios.find(
    (horario) => horario.day_of_week === diaDaSemana && horario.active,
  );

  if (!expediente) {
    return [];
  }

  const abertura = minutosDoHorario(expediente.start_time);
  const fechamento = minutosDoHorario(expediente.end_time);

  const statusQueBloqueiam = ["AGUARDANDO", "EM_ATENDIMENTO"];
  const ocupados = agendamentos
    .filter(
      (agendamento) =>
        agendamento.barber_id === barbeiro.id &&
        agendamento.tipo === "AGENDAMENTO" &&
        statusQueBloqueiam.includes(agendamento.status),
    )
    .map((agendamento) => {
      const inicio = new Date(agendamento.date_agend).getTime();
      const duracao = converterDuracaoMinutos(agendamento.duration_total);

      return {
        inicio,
        fim: inicio + duracao * 60_000,
      };
    })
    .filter(
      (ocupado) =>
        Number.isFinite(ocupado.inicio) &&
        Number.isFinite(ocupado.fim) &&
        ocupado.fim > ocupado.inicio,
    );

  const agora = Date.now();
  const disponiveis: string[] = [];

  // Oferece horários de início em intervalos de 30 minutos.
  for (
    let inicio = abertura;
    inicio + duracaoServico <= fechamento;
    inicio += 30
  ) {
    const inicioInstante = converterDataParaInstante(data, inicio);
    const fimInstante = inicioInstante + duracaoServico * 60_000;

    if (inicioInstante <= agora) {
      continue;
    }

    const temConflito = ocupados.some(
      (ocupado) => ocupado.inicio < fimInstante && ocupado.fim > inicioInstante,
    );

    if (!temConflito) {
      disponiveis.push(formatarHorario(inicio));
    }
  }

  return disponiveis;
}
