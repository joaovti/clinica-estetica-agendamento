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

  // Links dos perfis
  const instagramUrl = "https://www.instagram.com/jessica_morenomanicure";
  const whatsappNumber = "5511964304245";
  const whatsappUrl = `https://wa.me/${whatsappNumber}`;

  const instagramLogo = "https://firebasestorage.googleapis.com/v0/b/clinica-estetica-d68bb.firebasestorage.app/o/ig.png?alt=media&token=eaba9416-aac8-4a55-92e4-9c1def20267a";
  const whatsappLogo = "https://firebasestorage.googleapis.com/v0/b/clinica-estetica-d68bb.firebasestorage.app/o/wp.png?alt=media&token=579a1695-166c-4f39-850f-ed60aea68795";
  const logoPrincipal = "https://firebasestorage.googleapis.com/v0/b/clinica-estetica-d68bb.firebasestorage.app/o/logo.png?alt=media&token=1ad8165d-daba-410b-982a-d2aebb00fcf0";

  return (
    <div className="relative min-h-screen bg-pink-100 p-4">
      <link
        rel="icon"
        href={logoPrincipal}
        type="image/png"
      />

      {/* Topo com logo principal e ícones ao lado */}
      <div className="fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-pink-100 z-50 shadow-md flex-wrap gap-4">
  <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
    {/* Logo principal responsiva */}
    <img
      src={logoPrincipal}
      alt="Logo"
      className="w-24 h-24 sm:w-48 sm:h-48 object-contain"
    />

    {/* Ícones do Instagram e WhatsApp */}
    <div className="flex items-center gap-2 sm:gap-4">
      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="hover:opacity-80 transition-opacity"
      >
        <img
          src={instagramLogo}
          alt="Instagram"
          className="w-8 h-8 sm:w-16 sm:h-16 object-contain"
        />
      </a>

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="hover:opacity-80 transition-opacity"
      >
        <img
          src={whatsappLogo}
          alt="WhatsApp"
          className="w-8 h-8 sm:w-12 sm:h-12 object-contain"
        />
      </a>
    </div>
  </div>

        {/* Link para Admin no canto superior direito */}
        <Link
          to="/admin"
          className="text-sm text-blue-600"
        >
          Acesso Administrador
        </Link>
      </div>

      {/* Espaço para evitar que conteúdo fique atrás do topo fixo */}
      <div className="h-[13rem]" />

      {/* Modal de cadastro */}
      {etapa !== 'agendamento' && (
        <div className="fixed inset-0 bg-pink-100 flex justify-center items-center z-40">
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

      {/* Componente agendamento */}
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
