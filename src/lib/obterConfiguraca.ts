export function obterConfiguracao() {
  const apiUrl = process.env.API_URL?.replace(/\/+$/, "");
  const urlHost = process.env.API_URL_LOCAL;

  if (!apiUrl || !urlHost) {
    throw new Error("Configure API_URL e API_URL_LOCAL no .env.");
  }

  return { apiUrl, urlHost };
}
