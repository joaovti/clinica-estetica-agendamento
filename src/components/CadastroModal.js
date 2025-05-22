import { useState } from 'react';
import { collection, doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function CadastroModal({ onLogin }) {
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [existe, setExiste] = useState(null);

  const handleTelefoneSubmit = async (e) => {
    e.preventDefault();
    const docRef = doc(collection(db, 'clientes'), telefone);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      onLogin({ nome: docSnap.data().nome, telefone });
    } else {
      setExiste(false);
    }
  };

  const handleCadastroSubmit = async (e) => {
    e.preventDefault();
    const cliente = { nome, telefone };
    await setDoc(doc(collection(db, 'clientes'), telefone), cliente);
    onLogin(cliente);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-center mb-4">Identifique-se</h2>

        <form
          onSubmit={
            existe === false ? handleCadastroSubmit : handleTelefoneSubmit
          }
        >
          <div className="mb-4">
            <label className="block text-sm font-medium">Telefone</label>
            <input
              type="tel"
              required
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              className="w-full border rounded-xl p-2 mt-1"
            />
          </div>

          {existe === false && (
            <div className="mb-4">
              <label className="block text-sm font-medium">Nome</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full border rounded-xl p-2 mt-1"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded-xl hover:bg-blue-700"
          >
            {existe === false ? 'Cadastrar e Continuar' : 'Continuar'}
          </button>
        </form>
      </div>
    </div>
  );
}
