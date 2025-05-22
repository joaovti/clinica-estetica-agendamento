import React, { useEffect, useState } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isToday,
  isBefore,
  startOfDay,
  getDay,
  isSameDay
} from 'date-fns';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

const horariosFixos = [
  '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00',
  '17:00', '18:00',
];

const Agendamento = ({ nome }) => {
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [horariosDisponiveis, setHorariosDisponiveis] = useState([]);
  const [horarioSelecionado, setHorarioSelecionado] = useState(null);
  const [servicos, setServicos] = useState([]);
  const [servicosSelecionados, setServicosSelecionados] = useState([]);
  const [confirmado, setConfirmado] = useState(false);

  const diasDoMes = eachDayOfInterval({
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
  });

  useEffect(() => {
    const hoje = startOfDay(new Date());
    const dias = eachDayOfInterval({
      start: startOfMonth(new Date()),
      end: endOfMonth(new Date()),
    });

    const proximoDisponivel = dias.find((dia) => {
      const diaUtil = getDay(dia) >= 2 && getDay(dia) <= 6;
      return diaUtil && !isBefore(startOfDay(dia), hoje);
    });

    if (proximoDisponivel) {
      setDiaSelecionado(proximoDisponivel);
    }
  }, []);

  useEffect(() => {
    const carregarHorarios = async () => {
      if (!diaSelecionado) return;

      const dataFormatada = format(diaSelecionado, 'yyyy-MM-dd');
      const agendamentosRef = collection(db, 'agendamentos');
      const q = query(agendamentosRef, where('data', '==', dataFormatada));
      const snapshot = await getDocs(q);

      const horariosOcupados = snapshot.docs.map(doc => doc.data().horario);
      let horariosLivres = horariosFixos.filter(h => !horariosOcupados.includes(h));

      if (isSameDay(diaSelecionado, new Date())) {
        const agora = new Date();
        const horaAtual = agora.getHours();
        const minutos = agora.getMinutes();

        horariosLivres = horariosLivres.filter((h) => {
          const [hHora, hMin] = h.split(':').map(Number);
          return hHora > horaAtual || (hHora === horaAtual && hMin > minutos);
        });
      }

      setHorariosDisponiveis(horariosLivres);
      setHorarioSelecionado(null);
      setServicosSelecionados([]);
      setConfirmado(false);
    };

    carregarHorarios();
  }, [diaSelecionado]);

  useEffect(() => {
    const carregarServicos = async () => {
      try {
        const servicosRef = collection(db, 'servicos');
        const snapshot = await getDocs(servicosRef);
        const lista = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setServicos(lista);
      } catch (error) {
        console.error("Erro ao carregar serviços:", error);
      }
    };

    carregarServicos();
  }, []);

  const toggleServico = (id) => {
    if (servicosSelecionados.includes(id)) {
      setServicosSelecionados(servicosSelecionados.filter(s => s !== id));
    } else {
      setServicosSelecionados([...servicosSelecionados, id]);
    }
  };

  const selecionarTodos = () => {
    if (servicosSelecionados.length === servicos.length) {
      setServicosSelecionados([]);
    } else {
      setServicosSelecionados(servicos.map(s => s.id));
    }
  };

  const confirmarAgendamento = async () => {
    if (!horarioSelecionado || servicosSelecionados.length === 0) return;

    const dataFormatada = format(diaSelecionado, 'yyyy-MM-dd');
    await addDoc(collection(db, 'agendamentos'), {
      nome,
      data: dataFormatada,
      horario: horarioSelecionado,
      servicos: servicosSelecionados,
    });

    setConfirmado(true);
    setHorarioSelecionado(null);
    setServicosSelecionados([]);
  };

  const nomesDias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="min-h-screen bg-pink-100 p-6 max-w-2xl mx-auto">
      <div className="flex items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Agendamento</h1>
          <span className="text-lg font-medium text-gray-700">Olá, {nome}</span>
        </div>
      </div>

      {/* Calendário */}
      <div className="grid grid-cols-7 gap-2 mb-6">
        {diasDoMes.map((dia) => {
          const isFuturo = !isBefore(startOfDay(dia), startOfDay(new Date()));
          const diaSemana = getDay(dia);
          const permitido = diaSemana >= 2 && diaSemana <= 6;
          const selecionado = isSameDay(dia, diaSelecionado);

          if (!isFuturo || !permitido) return null;

          return (
            <button
              key={dia.toString()}
              onClick={() => setDiaSelecionado(dia)}
              className={`p-2 rounded-lg text-sm flex flex-col items-center justify-center
                ${selecionado ? 'bg-blue-500 text-white' : isToday(dia) ? 'bg-blue-200' : 'hover:bg-gray-200'}`}
            >
              <span className="text-base font-bold">{format(dia, 'dd')}</span>
              <span className="text-xs">{nomesDias[diaSemana]}</span>
            </button>
          );
        })}
      </div>

      {/* Horários disponíveis */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold mb-2">
          Horários disponíveis para {diaSelecionado ? format(diaSelecionado, 'dd/MM/yyyy') : 'Selecione um dia'}:
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {horariosDisponiveis.length > 0 ? (
            horariosDisponiveis.map((hora) => (
              <button
                key={hora}
                onClick={() => setHorarioSelecionado(hora)}
                className={`p-2 rounded text-sm ${horarioSelecionado === hora ? 'bg-blue-500 text-white' : 'bg-green-100 hover:bg-green-300'}`}
              >
                {hora}
              </button>
            ))
          ) : (
            <p className="text-red-600 col-span-full">Nenhum horário disponível</p>
          )}
        </div>
      </div>

      {/* Serviços */}
      {horarioSelecionado && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Selecione os serviços:</h3>
          <button
            className="text-sm mb-2 underline text-blue-600"
            onClick={selecionarTodos}
          >
            {servicosSelecionados.length === servicos.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>
          <div className="space-y-2">
            {servicos.map(servico => (
              <label key={servico.id} className="flex items-center gap-2 bg-gray-100 p-2 rounded">
                <input
                  type="checkbox"
                  checked={servicosSelecionados.includes(servico.id)}
                  onChange={() => toggleServico(servico.id)}
                />
                <div>
                  <div className="font-medium">{servico.nome}</div>
                  <div className="text-sm text-gray-600">R$ {servico.preco?.toFixed(2)}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Confirmação */}
      {horarioSelecionado && servicosSelecionados.length > 0 && !confirmado && (
        <div className="mt-4">
          <button
            onClick={confirmarAgendamento}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            Confirmar Agendamento
          </button>
        </div>
      )}

      {confirmado && (
        <p className="mt-4 text-green-700 font-semibold">
          Agendamento confirmado com sucesso!
        </p>
      )}
    </div>
  );
};

export default Agendamento;
