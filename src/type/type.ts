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

{
  /*export type Sessao = {
  etapa:
    | "menu"
    | "escolher_barbeiro"
    | "servicos"
    | "escolher_servico"
    | "atendente";
  barbeiros: Barbeiro[];
  barbeiro?: Barbeiro;
  servicos: Servico[];
};*/
}

export type Sessao = {
  etapa:
    | "menu"
    | "escolher_barbeiro"
    | "escolher_servico"
    | "escolher_data"
    | "escolher_horario"
    | "confirmar_agendamento"
    | "atendente";

  modo?: "agendamento" | "consulta";
  clienteId?: string;
  barbeiros: Barbeiro[];
  barbeiro?: Barbeiro;
  servicos: Servico[];

  // Dados selecionados durante o atendimento
  servicoSelecionado?: Servico;
  dataAgendamento?: string;
  horariosDisponiveis?: string[];
  horarioAgendamento?: string;
};

export type Agendamento = {
  client_id?: string;
  //client_name?: string;
  //client_phone?: string;
  barber_id: string;
  date_agend: string;
  service_ids: string[];
  tipo?: "AGENDAMENTO" | "FILA";
};

export type BarbeariaType = {
  id: string;
  name: string;
  barber_phone: string;
  img_url: string;
  public_id: string;
  barbearia_id: string;
};
