export type Barbeiro = {
  id: string;
  name: string;
  barbearia_id: string;
};

export type Duracao = {
  minutes?: number;
  hours?: number;
};

export type Servico = {
  id: string;
  name: string;
  price: string | number;
  duration: Duracao;
  barber_id: string;
};

export type Sessao = {
  etapa:
    | "menu"
    | "escolher_barbeiro"
    | "servicos"
    | "escolher_servico"
    | "atendente";
  barbeiros: Barbeiro[];
  barbeiro?: Barbeiro;
  servicos: Servico[];
};
