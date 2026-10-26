{
  /*import type strict from "node:assert/strict";
import OpenAI from "openai";

class DeepSeekService {
  private client: any;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error("DEEPSEEK_API_KEY não configurada.");
    }

    this.client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
  }

  async enviarMensagem(mensagem: string) {
    const response = await this.client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || "deepseek-flash",
      messages: [],
    });
    return response.choices[0]?.message?.content || "";
  }
}
export { DeepSeekService };*/
}
