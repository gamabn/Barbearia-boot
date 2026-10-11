export function obterConfiguracao() {
  const apiUrl = process.env.API_URL?.replace(/\/+$/, "");
  const barbeariaId = process.env.BARBERSHOP_ID;
  const urlHost = process.env.API_URL_LOCAL;

  if (!apiUrl || !barbeariaId || !urlHost) {
    throw new Error("Configure API_URL e BARBERSHOP_ID no .env.");
  }

  return { apiUrl, barbeariaId, urlHost };
}
