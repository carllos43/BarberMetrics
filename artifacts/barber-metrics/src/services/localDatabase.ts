
const STORAGE_KEY = "barbermetrics_clientes";

// Tipo de cliente
type Cliente = {
  id: number;
  nome: string;
  telefone: string;
};

// Buscar todos clientes
export function getClientes(): Cliente[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

// Salvar lista inteira
function saveClientes(clientes: Cliente[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
}

// Adicionar cliente
export function addCliente(cliente: Omit<Cliente, "id">) {
  const clientes = getClientes();

  const novoCliente: Cliente = {
    id: Date.now(),
    ...cliente,
  };

  clientes.push(novoCliente);
  saveClientes(clientes);
}

// Remover cliente
export function removeCliente(id: number) {
  const clientes = getClientes().filter(c => c.id !== id);
  saveClientes(clientes);
}

// Limpar tudo (reset)
export function clearClientes() {
  localStorage.removeItem(STORAGE_KEY);
}
