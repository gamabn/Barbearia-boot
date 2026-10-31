import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { calcularHorariosDisponiveis } from "./calcularHorariosDisponiveis.js";
import { processarMensagem } from "../atendimento.service.js";

const input = {
  data: "2030-01-06", barbeariaId: "shop-a",
  barbeiro: { id: "barber-a", name: "Barber", barbearia_id: "shop-a" },
  servico: { id: "service-a", name: "Cut", price: "30.00", duration: { hours: 1 }, barber_id: "barber-a" },
};
const result = {
  date: input.data, timeZone: "America/Sao_Paulo", slots: [
    { start_at: "2030-01-06T12:00:00.000Z", end_at: "2030-01-06T13:00:00.000Z" },
    { start_at: "2030-01-06T12:30:00.000Z", end_at: "2030-01-06T13:30:00.000Z" },
  ],
};
const previousUrl = process.env.API_URL;
const previousLocal = process.env.API_URL_LOCAL;

beforeEach(() => {
  process.env.API_URL = "https://backend.invalid";
  process.env.API_URL_LOCAL = "https://backend.invalid";
});
afterEach(() => {
  jest.restoreAllMocks();
  if (previousUrl === undefined) delete process.env.API_URL; else process.env.API_URL = previousUrl;
  if (previousLocal === undefined) delete process.env.API_URL_LOCAL; else process.env.API_URL_LOCAL = previousLocal;
});

describe("Disponibilidade pública do bot", () => {
  it("keeps HH:mm and 30 minute step using only the new public endpoint", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(result)));
    expect(await calcularHorariosDisponiveis(input)).toEqual(["09:00", "09:30"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [raw, options] = fetchMock.mock.calls[0]!;
    const url = new URL(String(raw));
    expect(url.pathname).toBe("/disponibilidade/shop-a");
    expect(url.searchParams.get("date")).toBe(input.data);
    expect(url.searchParams.get("barber_id")).toBe("barber-a");
    expect(url.searchParams.get("service_ids")).toBe("service-a");
    expect(url.searchParams.get("step_minutes")).toBe("30");
    expect(options?.credentials).toBe("omit");
    expect(options?.headers).toBeUndefined();
  });

  it("keeps closed-day empty lists", async () => {
    jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ ...result, slots: [] })));
    expect(await calcularHorariosDisponiveis(input)).toEqual([]);
  });

  it("does not fall back to a full agenda when availability fails", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Unavailable", { status: 503 }));
    await expect(calcularHorariosDisponiveis(input)).rejects.toThrow("HTTP 503");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a response for another date or timezone", async () => {
    const fetchMock = jest.spyOn(globalThis, "fetch");
    for (const body of [{ ...result, date: "2030-01-07" }, { ...result, timeZone: "UTC" }]) {
      fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body)));
      await expect(calcularHorariosDisponiveis(input)).rejects.toThrow("Resposta de disponibilidade inválida");
    }
  });

  it("conversation validates the civil date without depending on the host local day", async () => {
    // Simulate the local getter being on the following day (e.g. UTC+13).
    jest.spyOn(Date.prototype, "getDate").mockReturnValue(7);
    const fetchMock = jest.spyOn(globalThis, "fetch").mockImplementation(async (url) => {
      const pathname = new URL(String(url)).pathname;
      const body = pathname.startsWith("/barber/many/") ? [input.barbeiro]
        : pathname.startsWith("/service/") ? [input.servico] : result;
      return new Response(JSON.stringify(body));
    });
    const send = (message: string) => processarMensagem("timezone-test", message, "client-a", "11900000000", input.barbeariaId, "Shop A");
    await send("menu");
    await send("1");
    await send("1");
    await send("1");
    const answer = await send("06/01/2030");
    expect(answer).toContain("09:00");
    expect(answer).toContain("09:30");
    expect(fetchMock.mock.calls.some(([url]) => new URL(String(url)).pathname.startsWith("/agendamento/"))).toBe(false);
  });
});
