import { type Duracao } from "../../type/type.js";

export function formatarDuracao(duracao: Duracao): string {
  const minutos = (duracao.hours ?? 0) * 60 + (duracao.minutes ?? 0);

  if (minutos === 0) return "Duração não informada";
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;

  return resto > 0 ? `${horas}h ${resto}min` : `${horas}h`;
}

export function formatarPreco(preco: string | number): string {
  return Number(preco).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
