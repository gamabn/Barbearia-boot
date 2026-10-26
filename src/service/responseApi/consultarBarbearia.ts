import { obterConfiguracao } from "../../lib/obterConfiguraca.js";
import { type BarbeariaType } from "../../type/type.js";

class Barbearia {
  async consultar(barbeariaId: string): Promise<BarbeariaType>  {
    const { urlHost } = obterConfiguracao();
   // const response = await fetch(`${urlHost}/user`);
      const response = await fetch(`${urlHost}/user/${barbeariaId}`);

    if (!response.ok) {
      throw new Error("Erro no servidor.");
    }
    const res: BarbeariaType = await response.json();
    return res;
  }
}
export { Barbearia };
