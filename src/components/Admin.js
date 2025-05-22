import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy, where, doc, updateDoc } from 'firebase/firestore';
import { debounce } from 'lodash';

const Admin = () => {
  const [agendamentosHoje, setAgendamentosHoje] = useState([]);
  const [agendamentosAnteriores, setAgendamentosAnteriores] = useState([]);
  const [agendamentosFuturos, setAgendamentosFuturos] = useState([]);
  const [mostrarAnteriores, setMostrarAnteriores] = useState(false);
  const [mostrarFuturos, setMostrarFuturos] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const [termoPesquisa, setTermoPesquisa] = useState('');
  const [resultadosPesquisa, setResultadosPesquisa] = useState([]);
  const [erroPesquisa, setErroPesquisa] = useState('');
  const [loadingPesquisa, setLoadingPesquisa] = useState(false);
  // Estados para autenticação
  const [autenticado, setAutenticado] = useState(false);
  const [usuarioAdmin, setUsuarioAdmin] = useState('');
  const [senhaAdmin, setSenhaAdmin] = useState('');
  const [erroLogin, setErroLogin] = useState('');
  // Estados para gerenciamento de clientes
  const [mostrarGerenciarClientes, setMostrarGerenciarClientes] = useState(false);
  const [termoPesquisaClientes, setTermoPesquisaClientes] = useState('');
  const [resultadosClientes, setResultadosClientes] = useState([]);
  const [erroPesquisaClientes, setErroPesquisaClientes] = useState('');
  const [loadingPesquisaClientes, setLoadingPesquisaClientes] = useState(false);
  const [editandoCliente, setEditandoCliente] = useState(null);
  const [nomeEditado, setNomeEditado] = useState('');
  const [telefoneEditado, setTelefoneEditado] = useState('');

  // Função para obter a data atual sem a hora
  const getDataAtual = () => {
    const hoje = new Date();
    return new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  };

  // Função para formatar a data e horário
  const formatarData = (dataStr, horarioStr) => {
    if (!dataStr || !horarioStr) return 'Data/Horário não disponível';
    try {
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      const [hora, minuto] = horarioStr.split(':').map(Number);
      const data = new Date(ano, mes - 1, dia, hora, minuto);
      if (isNaN(data.getTime())) throw new Error('Data inválida');
      return data.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return 'Data/Horário inválido';
    }
  };

  // Função para criar um objeto Date a partir de data e horário
  const criarDataAgendamento = (dataStr, horarioStr) => {
    if (!dataStr || !horarioStr) return null;
    try {
      const [ano, mes, dia] = dataStr.split('-').map(Number);
      const [hora, minuto] = horarioStr.split(':').map(Number);
      const data = new Date(ano, mes - 1, dia, hora, minuto);
      if (isNaN(data.getTime())) return null;
      return data;
    } catch {
      return null;
    }
  };

  // Função para buscar o telefone do cliente usando um mapa
  const buscarTelefoneCliente = (nome, mapaClientes) => {
    if (!nome) return 'Não informado';
    for (const cliente of mapaClientes) {
      if (cliente.nome === nome) {
        return cliente.telefone || 'Não informado';
      }
    }
    return 'Não informado';
  };

  // Função para autenticação
  const handleLogin = async () => {
    if (!usuarioAdmin.trim() || !senhaAdmin.trim()) {
      setErroLogin('Usuário e senha são obrigatórios');
      return;
    }

    try {
      const adminsRef = collection(db, 'admins');
      const q = query(adminsRef, where('user', '==', usuarioAdmin.trim()));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setErroLogin('Usuário ou senha incorretos');
        return;
      }

      let autenticado = false;
      snapshot.forEach((doc) => {
        const dados = doc.data();
        if (dados.senha === senhaAdmin.trim()) {
          autenticado = true;
        }
      });

      if (autenticado) {
        setAutenticado(true);
        setUsuarioAdmin('');
        setSenhaAdmin('');
        setErroLogin('');
      } else {
        setErroLogin('Usuário ou senha incorretos');
      }
    } catch (error) {
      console.error('Erro ao autenticar:', error);
      setErroLogin('Erro ao autenticar. Tente novamente mais tarde.');
    }
  };

  // Função para carregar os agendamentos iniciais
  useEffect(() => {
    if (!autenticado) return;

    const carregarAgendamentos = async () => {
      try {
        setLoading(true);
        setErro('');

        // Carregar clientes para criar um mapa
        const clientesSnapshot = await getDocs(collection(db, 'clientes'));
        const mapaClientes = clientesSnapshot.docs.map((doc) => doc.data());

        const agendamentosRef = collection(db, 'agendamentos');
        const q = query(agendamentosRef, orderBy('data', 'asc'), orderBy('horario', 'asc'));
        const snapshot = await getDocs(q);

        const hoje = getDataAtual();
        const inicioDia = new Date(hoje);
        const fimDia = new Date(hoje);
        fimDia.setDate(fimDia.getDate() + 1);

        const agendamentosHoje = [];
        const agendamentosAnteriores = [];
        const agendamentosFuturos = [];

        for (const doc of snapshot.docs) {
          const dados = { id: doc.id, ...doc.data() };
          if (!dados.data || !dados.horario) continue;

          const dataAgendamento = criarDataAgendamento(dados.data, dados.horario);
          if (!dataAgendamento) continue;

          const telefone = buscarTelefoneCliente(dados.nome, mapaClientes);
          const agendamentoComTelefone = { ...dados, telefone };

          if (dataAgendamento >= inicioDia && dataAgendamento < fimDia) {
            agendamentosHoje.push(agendamentoComTelefone);
          } else if (dataAgendamento < inicioDia) {
            agendamentosAnteriores.push(agendamentoComTelefone);
          } else {
            agendamentosFuturos.push(agendamentoComTelefone);
          }
        }

        setAgendamentosHoje(agendamentosHoje);
        setAgendamentosAnteriores(agendamentosAnteriores);
        setAgendamentosFuturos(agendamentosFuturos);
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
        setErro('Erro ao carregar os agendamentos. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    carregarAgendamentos();
  }, [autenticado]);

  // Função para realizar a pesquisa de agendamentos
  const realizarPesquisa = async () => {
    if (!termoPesquisa.trim()) {
      setResultadosPesquisa([]);
      setErroPesquisa('Digite um nome ou telefone para pesquisar.');
      return;
    }

    try {
      setLoadingPesquisa(true);
      setErroPesquisa('');
      const termo = termoPesquisa.trim().toLowerCase();

      // Carregar clientes para criar um mapa
      const clientesSnapshot = await getDocs(collection(db, 'clientes'));
      const mapaClientes = clientesSnapshot.docs.map((doc) => doc.data());

      const agendamentosRef = collection(db, 'agendamentos');
      const resultados = [];

      // Busca por nome em agendamentos
      const qNome = query(agendamentosRef, orderBy('data', 'asc'), orderBy('horario', 'asc'));
      const snapshotNome = await getDocs(qNome);

      for (const doc of snapshotNome.docs) {
        const dados = { id: doc.id, ...doc.data() };
        if (!dados.data || !dados.horario || !dados.nome) continue;

        if (dados.nome.toLowerCase().includes(termo)) {
          const telefone = buscarTelefoneCliente(dados.nome, mapaClientes);
          resultados.push({ ...dados, telefone });
        }
      }

      // Busca por telefone em clientes
      const clientesRef = collection(db, 'clientes');
      const qTelefone = query(
        clientesRef,
        where('telefone', '>=', termo),
        where('telefone', '<=', termo + '\uf8ff')
      );
      const snapshotTelefone = await getDocs(qTelefone);

      const nomesPorTelefone = snapshotTelefone.docs.map((doc) => doc.data().nome);

      // Buscar agendamentos para os nomes encontrados
      for (const nome of nomesPorTelefone) {
        const qAgendamentosPorNome = query(
          agendamentosRef,
          where('nome', '==', nome),
          orderBy('data', 'asc'),
          orderBy('horario', 'asc')
        );
        const snapshotAgendamentos = await getDocs(qAgendamentosPorNome);

        for (const doc of snapshotAgendamentos.docs) {
          const dados = { id: doc.id, ...doc.data() };
          if (!dados.data || !dados.horario) continue;

          const telefone = buscarTelefoneCliente(dados.nome, mapaClientes);
          resultados.push({ ...dados, telefone });
        }
      }

      // Remover duplicatas
      const resultadosUnicos = Array.from(
        new Map(resultados.map((item) => [item.id, item])).values()
      );

      setResultadosPesquisa(resultadosUnicos);
    } catch (error) {
      console.error('Erro na pesquisa:', error);
      setErroPesquisa('Erro ao realizar a pesquisa. Verifique sua conexão ou tente novamente.');
      setResultadosPesquisa([]);
    } finally {
      setLoadingPesquisa(false);
    }
  };

  // Função com debounce para pressionar Enter (agendamentos)
  const realizarPesquisaDebounced = debounce(realizarPesquisa, 300);

  // Manipulador para pressionar Enter (agendamentos)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      realizarPesquisaDebounced();
    }
  };

  // Função para realizar a pesquisa de clientes
  const realizarPesquisaClientes = async () => {
    if (!termoPesquisaClientes.trim()) {
      setResultadosClientes([]);
      setErroPesquisaClientes('Digite um nome ou telefone para pesquisar.');
      return;
    }

    try {
      setLoadingPesquisaClientes(true);
      setErroPesquisaClientes('');
      const termo = termoPesquisaClientes.trim().toLowerCase();

      const clientesRef = collection(db, 'clientes');
      const resultados = [];

      // Busca por nome
      const qNome = query(clientesRef);
      const snapshotNome = await getDocs(qNome);

      for (const doc of snapshotNome.docs) {
        const dados = { id: doc.id, ...doc.data() };
        if (dados.nome && dados.nome.toLowerCase().includes(termo)) {
          resultados.push(dados);
        }
      }

      // Busca por telefone
      const qTelefone = query(
        clientesRef,
        where('telefone', '>=', termo),
        where('telefone', '<=', termo + '\uf8ff')
      );
      const snapshotTelefone = await getDocs(qTelefone);

      for (const doc of snapshotTelefone.docs) {
        const dados = { id: doc.id, ...doc.data() };
        if (!resultados.some((r) => r.id === dados.id)) {
          resultados.push(dados);
        }
      }

      setResultadosClientes(resultados);
    } catch (error) {
      console.error('Erro na pesquisa de clientes:', error);
      setErroPesquisaClientes('Erro ao realizar a pesquisa. Verifique sua conexão ou tente novamente.');
      setResultadosClientes([]);
    } finally {
      setLoadingPesquisaClientes(false);
    }
  };

  // Função com debounce para pressionar Enter (clientes)
  const realizarPesquisaClientesDebounced = debounce(realizarPesquisaClientes, 300);

  // Manipulador para pressionar Enter (clientes)
  const handleKeyDownClientes = (e) => {
    if (e.key === 'Enter') {
      realizarPesquisaClientesDebounced();
    }
  };

  // Função para iniciar a edição de um cliente
  const iniciarEdicaoCliente = (cliente) => {
    setEditandoCliente(cliente);
    setNomeEditado(cliente.nome || '');
    setTelefoneEditado(cliente.telefone || '');
  };

  // Função para salvar as alterações do cliente
  const salvarEdicaoCliente = async () => {
    if (!nomeEditado.trim() || !telefoneEditado.trim()) {
      setErroPesquisaClientes('Nome e telefone são obrigatórios.');
      return;
    }

    try {
      const clienteRef = doc(db, 'clientes', editandoCliente.id);
      await updateDoc(clienteRef, {
        nome: nomeEditado.trim(),
        telefone: telefoneEditado.trim(),
      });

      // Atualizar resultados localmente
      setResultadosClientes((prev) =>
        prev.map((cliente) =>
          cliente.id === editandoCliente.id
            ? { ...cliente, nome: nomeEditado.trim(), telefone: telefoneEditado.trim() }
            : cliente
        )
      );

      setEditandoCliente(null);
      setNomeEditado('');
      setTelefoneEditado('');
      setErroPesquisaClientes('');
    } catch (error) {
      console.error('Erro ao salvar alterações do cliente:', error);
      setErroPesquisaClientes('Erro ao salvar alterações. Tente novamente.');
    }
  };

  // Componente para renderizar um agendamento
  const renderAgendamento = (agendamento) => (
    <div
      key={agendamento.id}
      className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-2"
    >
      <p><strong>Cliente:</strong> {agendamento.nome || 'Não informado'}</p>
      <p><strong>Data e Hora:</strong> {formatarData(agendamento.data, agendamento.horario)}</p>
      <p><strong>Telefone:</strong> {agendamento.telefone}</p>
      <p><strong>Serviços:</strong> {Array.isArray(agendamento.servicos) ? agendamento.servicos.join(', ') : agendamento.servicos || 'Não informado'}</p>
    </div>
  );

  // Componente para renderizar um cliente
  const renderCliente = (cliente) => (
    <div
      key={cliente.id}
      className="p-4 bg-gray-50 border border-gray-200 rounded-lg mb-2 flex justify-between items-center"
    >
      <div>
        <p><strong>Nome:</strong> {cliente.nome || 'Não informado'}</p>
        <p><strong>Telefone:</strong> {cliente.telefone || 'Não informado'}</p>
      </div>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => iniciarEdicaoCliente(cliente)}
      >
        Editar
      </button>
    </div>
  );

  if (!autenticado) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Área do Administrador</h1>
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Autenticação Necessária</h2>
            {erroLogin && <p className="text-red-600 mb-2">{erroLogin}</p>}
            <input
              type="text"
              placeholder="Usuário"
              value={usuarioAdmin}
              onChange={(e) => setUsuarioAdmin(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded mb-2"
            />
            <input
              type="password"
              placeholder="Senha"
              value={senhaAdmin}
              onChange={(e) => setSenhaAdmin(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded mb-4"
            />
            <div className="flex justify-end">
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={handleLogin}
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Área do Administrador</h1>

      {/* Botões para pesquisa e gerenciamento de clientes */}
      <div className="flex gap-4 mb-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          onClick={() => setMostrarPesquisa(true)}
        >
          Pesquisar Agendamentos
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg"
          onClick={() => setMostrarGerenciarClientes(true)}
        >
          Gerenciar Clientes
        </button>
      </div>

      {loading ? (
        <p className="text-gray-600">Carregando agendamentos...</p>
      ) : erro ? (
        <p className="text-red-600">{erro}</p>
      ) : (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Agendamentos de Hoje</h2>
            {agendamentosHoje.length > 0 ? (
              agendamentosHoje.map(renderAgendamento)
            ) : (
              <p className="text-gray-600">Nenhum agendamento para hoje.</p>
            )}
          </div>
          <div>
            <button
              className="w-full text-left bg-blue-600 text-white px-4 py-2 rounded-lg mb-2 flex justify-between items-center"
              onClick={() => setMostrarAnteriores(!mostrarAnteriores)}
            >
              <span>Agendamentos Anteriores</span>
              <span>{mostrarAnteriores ? '▲' : '▼'}</span>
            </button>
            {mostrarAnteriores && (
              <div className="ml-4">
                {agendamentosAnteriores.length > 0 ? (
                  agendamentosAnteriores.map(renderAgendamento)
                ) : (
                  <p className="text-gray-600">Nenhum agendamento anterior.</p>
                )}
              </div>
            )}
          </div>
          <div>
            <button
              className="w-full text-left bg-blue-600 text-white px-4 py-2 rounded-lg mb-2 flex justify-between items-center"
              onClick={() => setMostrarFuturos(!mostrarFuturos)}
            >
              <span>Agendamentos Futuros</span>
              <span>{mostrarFuturos ? '▲' : '▼'}</span>
            </button>
            {mostrarFuturos && (
              <div className="ml-4">
                {agendamentosFuturos.length > 0 ? (
                  agendamentosFuturos.map(renderAgendamento)
                ) : (
                  <p className="text-gray-600">Nenhum agendamento futuro.</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Pesquisa de Agendamentos */}
      {mostrarPesquisa && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Pesquisar Agendamentos</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                id="search-input"
                name="search"
                placeholder="Digite o nome ou telefone"
                value={termoPesquisa}
                onChange={(e) => setTermoPesquisa(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full border border-gray-300 p-2 rounded"
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={realizarPesquisa}
                disabled={loadingPesquisa}
              >
                Pesquisar
              </button>
            </div>
            {loadingPesquisa && <p className="text-gray-600 mb-2">Pesquisando...</p>}
            {erroPesquisa && <p className="text-red-600 mb-2">{erroPesquisa}</p>}
            <div className="max-h-60 overflow-y-auto">
              {resultadosPesquisa.length > 0 ? (
                resultadosPesquisa.map(renderAgendamento)
              ) : (
                <p className="text-gray-600">Nenhum agendamento encontrado.</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="bg-gray-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  setMostrarPesquisa(false);
                  setTermoPesquisa('');
                  setResultadosPesquisa([]);
                  setErroPesquisa('');
                  setLoadingPesquisa(false);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Clientes */}
      {mostrarGerenciarClientes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Gerenciar Clientes</h2>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                id="search-clientes"
                name="search-clientes"
                placeholder="Digite o nome ou telefone"
                value={termoPesquisaClientes}
                onChange={(e) => setTermoPesquisaClientes(e.target.value)}
                onKeyDown={handleKeyDownClientes}
                className="w-full border border-gray-300 p-2 rounded"
              />
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={realizarPesquisaClientes}
                disabled={loadingPesquisaClientes}
              >
                Pesquisar
              </button>
            </div>
            {loadingPesquisaClientes && <p className="text-gray-600 mb-2">Pesquisando...</p>}
            {erroPesquisaClientes && <p className="text-red-600 mb-2">{erroPesquisaClientes}</p>}
            <div className="max-h-60 overflow-y-auto">
              {resultadosClientes.length > 0 ? (
                resultadosClientes.map(renderCliente)
              ) : (
                <p className="text-gray-600">Nenhum cliente encontrado.</p>
              )}
            </div>
            <div className="flex justify-end mt-4">
              <button
                className="bg-gray-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  setMostrarGerenciarClientes(false);
                  setTermoPesquisaClientes('');
                  setResultadosClientes([]);
                  setErroPesquisaClientes('');
                  setLoadingPesquisaClientes(false);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição de Cliente */}
      {editandoCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Editar Cliente</h2>
            {erroPesquisaClientes && <p className="text-red-600 mb-2">{erroPesquisaClientes}</p>}
            <input
              type="text"
              placeholder="Nome"
              value={nomeEditado}
              onChange={(e) => setNomeEditado(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded mb-2"
            />
            <input
              type="text"
              placeholder="Telefone"
              value={telefoneEditado}
              onChange={(e) => setTelefoneEditado(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                className="bg-gray-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  setEditandoCliente(null);
                  setNomeEditado('');
                  setTelefoneEditado('');
                  setErroPesquisaClientes('');
                }}
              >
                Cancelar
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={salvarEdicaoCliente}
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;