import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Agendamento from './components/Agendamento';
import Admin from './components/Admin';
import { db } from './firebase';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';

function AppWrapper() {
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [etapa, setEtapa] = useState('telefone');


  const formatarTelefone = (numero) => {
    return `(${numero.slice(0, 2)}) ${numero.slice(2, 7)}-${numero.slice(7)}`;
  };

  const verificarTelefone = async () => {
    const numeroLimpo = telefone.replace(/\D/g, '');

    if (numeroLimpo.length !== 11) {
      alert('Telefone inválido. Use o formato DDD + número (11 dígitos).');
      return;
    }

    const confirmado = window.confirm(
      `Este número está correto?\n${formatarTelefone(numeroLimpo)}`
    );
    if (!confirmado) return;

    const clientesRef = collection(db, 'clientes');
    const q = query(clientesRef, where('telefone', '==', numeroLimpo));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const cliente = snapshot.docs[0].data();
      setNome(cliente.nome);
      setEtapa('agendamento');
    } else {
      setTelefone(numeroLimpo);
      setEtapa('nome');
    }
  };

  const cadastrarCliente = async () => {
    if (!nome.trim()) {
      alert('Por favor, digite um nome válido.');
      return;
    }

    const clientesRef = collection(db, 'clientes');
    await addDoc(clientesRef, { nome, telefone });
    setEtapa('agendamento');
  };

  return (
    <div className="relative min-h-screen bg-pink-100 p-4">
      <link rel="icon" href="https://firebasestorage.googleapis.com/v0/b/clinica-estetica-d68bb.firebasestorage.app/o/logo.png?alt=media&token=1ad8165d-daba-410b-982a-d2aebb00fcf0" type="image/png" />

      <div className="flex justify-between items-start z-50 relative">
        <img
          src="https://firebasestorage.googleapis.com/v0/b/clinica-estetica-d68bb.firebasestorage.app/o/logo.png?alt=media&token=1ad8165d-daba-410b-982a-d2aebb00fcf0"
          alt="Logo"
          className="w-48 h-48 object-contain"
        />
        <Link
          to="/admin"
          className="text-sm text-blue-600 underline mt-4 mr-4"
        >
          Acesso Administrador
        </Link>
      </div>

      {etapa !== 'agendamento' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-40">
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md">
            {etapa === 'telefone' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Digite seu telefone:</h2>
                <input
                  type="text"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Ex: (11) 97272-9037"
                  maxLength={15}
                />
                <button
                  onClick={verificarTelefone}
                  className="bg-blue-500 text-white px-4 py-2 rounded w-full"
                >
                  Continuar
                </button>
              </div>
            )}

            {etapa === 'nome' && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Informe seu nome:</h2>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full p-2 border rounded"
                  placeholder="Seu nome completo"
                />
                <button
                  onClick={cadastrarCliente}
                  className="bg-green-500 text-white px-4 py-2 rounded w-full"
                >
                  Cadastrar e Continuar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {etapa === 'agendamento' && <Agendamento nome={nome} />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppWrapper />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
}

export default App;
