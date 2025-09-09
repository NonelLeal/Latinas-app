import React, { useState, useEffect } from 'react';
import { auth, firestore } from './firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged, 
    signOut,
    signInAnonymously 
} from 'firebase/auth';
import { 
    onSnapshot, 
    collection, 
    query, 
    addDoc, 
    serverTimestamp, 
    orderBy 
} from 'firebase/firestore';

const App = () => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authLoading, setAuthLoading] = useState(false);
    const [screen, setScreen] = useState('home');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [alertMessage, setAlertMessage] = useState({ show: false, text: '', type: 'info' });

    // Monitorar mudanças de autenticação
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                setScreen('home');
            } else {
                setUser(null);
                setScreen('login');
                // Login anônimo automático para visitantes
                try {
                    await signInAnonymously(auth);
                } catch (error) {
                    console.error("Erro no login anônimo:", error);
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Buscar mensagens do chat em tempo real
    useEffect(() => {
        if (user && screen === 'chat') {
            const q = query(
                collection(firestore, 'latinas_chat'), 
                orderBy('timestamp', 'asc')
            );
            
            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setMessages(fetchedMessages);
            }, (error) => {
                console.error("Erro ao buscar mensagens:", error);
                showAlert('Erro ao carregar mensagens', 'error');
            });

            return () => unsubscribe();
        }
    }, [user, screen]);

    // Validar email
    const isValidEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    // Lida com a autenticação
    const handleAuth = async (isRegister) => {
        if (!email || !password) {
            showAlert('Por favor, preencha todos os campos', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showAlert('Por favor, insira um email válido', 'error');
            return;
        }

        if (password.length < 6) {
            showAlert('A senha deve ter pelo menos 6 caracteres', 'error');
            return;
        }

        setAuthLoading(true);
        try {
            if (isRegister) {
                await createUserWithEmailAndPassword(auth, email, password);
                showAlert('Cadastro realizado com sucesso!', 'success');
            } else {
                await signInWithEmailAndPassword(auth, email, password);
                showAlert('Login realizado com sucesso!', 'success');
            }
            
            setEmail('');
            setPassword('');
        } catch (error) {
            console.error("Erro de autenticação:", error);
            
            // Tratamento de erros específicos do Firebase
            let errorMessage = 'Erro na autenticação';
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = 'Este email já está em uso';
                    break;
                case 'auth/weak-password':
                    errorMessage = 'A senha é muito fraca';
                    break;
                case 'auth/user-not-found':
                    errorMessage = 'Usuário não encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Senha incorreta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                default:
                    errorMessage = error.message || 'Erro desconhecido';
            }
            
            showAlert(errorMessage, 'error');
        }
        setAuthLoading(false);
    };

    // Lida com o logout
    const handleLogout = async () => {
        setAuthLoading(true);
        try {
            await signOut(auth);
            setMessages([]);
            showAlert('Logout realizado com sucesso', 'success');
        } catch (error) {
            console.error("Erro ao fazer logout:", error);
            showAlert('Erro ao fazer logout', 'error');
        }
        setAuthLoading(false);
    };

    // Enviar mensagem
    const handleSendMessage = async () => {
        if (newMessage.trim() === '') return;

        try {
            await addDoc(collection(firestore, 'latinas_chat'), {
                text: newMessage.trim(),
                userId: user.uid,
                userEmail: user.email || 'Usuário Anônimo',
                timestamp: serverTimestamp(),
                isTeam: false
            });
            
            setNewMessage('');
        } catch (error) {
            console.error("Erro ao enviar mensagem:", error);
            showAlert('Erro ao enviar mensagem', 'error');
        }
    };

    // Exibir alerta
    const showAlert = (message, type = 'info') => {
        setAlertMessage({ show: true, text: message, type });
        setTimeout(() => {
            setAlertMessage({ show: false, text: '', type: 'info' });
        }, 4000);
    };

    // Componente de serviço
    const ServiceCard = ({ title, description, price, icon }) => (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 rounded-xl border border-gray-200 hover:shadow-md transition-all duration-300 hover:scale-105">
            <div className="flex justify-between items-center">
                <div className="flex items-start space-x-3">
                    <span className="text-2xl">{icon}</span>
                    <div>
                        <h3 className="font-semibold text-gray-800">{title}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                    </div>
                </div>
                <div className="text-lg font-bold text-green-600">{price}</div>
            </div>
        </div>
    );

    // Renderizar telas
    const renderScreen = () => {
        switch (screen) {
            case 'login':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
                        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-r from-red-500 to-pink-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <span className="text-white text-2xl font-bold">L</span>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">Bem-vindo(a)</h2>
                                <p className="text-gray-600">Faça login para continuar</p>
                            </div>
                            
                            <div className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="E-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <input
                                    type="password"
                                    placeholder="Senha (mín. 6 caracteres)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <button
                                    onClick={() => handleAuth(false)}
                                    disabled={authLoading}
                                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                >
                                    {authLoading ? 'Entrando...' : 'Entrar'}
                                </button>
                            </div>
                            
                            <div className="mt-6 text-center space-y-2">
                                <p className="text-sm text-gray-500">
                                    Não tem uma conta? 
                                    <button 
                                        onClick={() => setScreen('register')} 
                                        className="text-blue-500 font-semibold hover:underline ml-1"
                                    >
                                        Cadastre-se
                                    </button>
                                </p>
                                <button className="text-sm text-blue-500 font-semibold hover:underline">
                                    Esqueci minha senha
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'register':
                return (
                    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
                        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                                    <span className="text-white text-2xl">👤</span>
                                </div>
                                <h2 className="text-3xl font-bold text-gray-800 mb-2">Cadastre-se</h2>
                                <p className="text-gray-600">Crie sua conta gratuitamente</p>
                            </div>
                            
                            <div className="space-y-4">
                                <input
                                    type="email"
                                    placeholder="E-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                />
                                <input
                                    type="password"
                                    placeholder="Senha (mín. 6 caracteres)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full p-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                                />
                                <button
                                    onClick={() => handleAuth(true)}
                                    disabled={authLoading}
                                    className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                >
                                    {authLoading ? 'Cadastrando...' : 'Criar Conta'}
                                </button>
                            </div>
                            
                            <p className="mt-6 text-center text-sm text-gray-500">
                                Já tem uma conta? 
                                <button 
                                    onClick={() => setScreen('login')} 
                                    className="text-green-500 font-semibold hover:underline ml-1"
                                >
                                    Entrar
                                </button>
                            </p>
                        </div>
                    </div>
                );

            case 'home':
                return (
                    <div className="flex-1">
                        <header className="bg-gradient-to-r from-red-500 via-pink-500 to-red-600 text-white p-6 rounded-b-3xl shadow-xl">
                            <div className="text-center">
                                <h1 className="text-3xl font-bold mb-1">✨ Latinas</h1>
                                <p className="text-lg opacity-90">Serviços de Limpeza Premium</p>
                                <p className="text-sm opacity-75 mt-2">🏆 Qualidade garantida • 📞 Atendimento 24h</p>
                            </div>
                        </header>

                        <div className="p-6 space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                                    🏠 Serviços Residenciais
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <ServiceCard 
                                        icon="❄️" 
                                        title="Limpeza de geladeira" 
                                        description="Limpeza interna e externa completa" 
                                        price="R$ 25" 
                                    />
                                    <ServiceCard 
                                        icon="🔥" 
                                        title="Limpeza de forno" 
                                        description="Remoção de gordura e resíduos" 
                                        price="R$ 20" 
                                    />
                                    <ServiceCard 
                                        icon="👔" 
                                        title="Organização de armários" 
                                        description="Organizar roupas e utensílios" 
                                        price="R$ 30" 
                                    />
                                    <ServiceCard 
                                        icon="🪟" 
                                        title="Limpeza de janelas" 
                                        description="Limpeza interna cristalina" 
                                        price="R$ 15" 
                                    />
                                </div>
                            </div>

                            <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
                                <h2 className="text-xl font-bold mb-6 text-gray-800 flex items-center">
                                    🏢 Serviços Comerciais
                                </h2>
                                <ServiceCard 
                                    icon="💼" 
                                    title="Limpeza Comercial" 
                                    description="Escritórios e estabelecimentos (3-6 horas)" 
                                    price="R$ 120" 
                                />
                            </div>

                            <div className="text-center">
                                <button 
                                    onClick={() => setScreen('chat')} 
                                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105 hover:shadow-2xl"
                                >
                                    💬 Fale com nossa equipe
                                </button>
                                <p className="text-sm text-gray-500 mt-2">Resposta em tempo real</p>
                            </div>
                        </div>
                    </div>
                );

            case 'chat':
                return (
                    <div className="flex-1 flex flex-col">
                        <div className="bg-white p-4 border-b border-gray-200 shadow-sm">
                            <div className="flex items-center justify-between">
                                <button 
                                    onClick={() => setScreen('home')} 
                                    className="text-blue-500 font-semibold hover:text-blue-700 transition-colors flex items-center"
                                >
                                    ← Voltar
                                </button>
                                <div className="text-center">
                                    <h2 className="text-lg font-bold text-gray-800">💬 Chat da Equipe</h2>
                                    <div className="flex items-center justify-center space-x-1 text-xs text-green-600">
                                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                        <span>Firebase Online</span>
                                    </div>
                                </div>
                                <div className="w-16"></div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-white">
                            <div className="space-y-4 max-w-4xl mx-auto">
                                {messages.length === 0 ? (
                                    <div className="text-center text-gray-500 py-12">
                                        <div className="text-6xl mb-4">💭</div>
                                        <p className="text-lg font-semibold">Seja o primeiro a enviar uma mensagem!</p>
                                        <p className="text-sm mt-2">As mensagens ficam salvas no Firebase</p>
                                    </div>
                                ) : (
                                    messages.map((msg) => (
                                        <div 
                                            key={msg.id} 
                                            className={`flex ${msg.isTeam ? 'justify-start' : 'justify-end'}`}
                                        >
                                            <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-sm ${
                                                msg.isTeam
                                                    ? 'bg-white text-gray-800 border border-gray-200' 
                                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                            }`}>
                                                <p className="font-semibold text-sm mb-1 flex items-center">
                                                    {msg.isTeam ? (
                                                        <>🎧 Equipe Latinas</>
                                                    ) : (
                                                        <>👤 {msg.userEmail || 'Você'}</>
                                                    )}
                                                </p>
                                                <p className="leading-relaxed">{msg.text}</p>
                                                <p className="text-xs opacity-75 mt-2 text-right">
                                                    {msg.timestamp?.toDate ? 
                                                        msg.timestamp.toDate().toLocaleTimeString('pt-BR', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        }) : 
                                                        'Enviando...'
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-white p-4 border-t border-gray-200 shadow-lg">
                            <div className="flex items-center space-x-3 max-w-4xl mx-auto">
                                <input
                                    type="text"
                                    placeholder="Digite sua mensagem... 📝"
                                    className="flex-1 p-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => { 
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleSendMessage();
                                        }
                                    }}
                                />
                                <button
                                    onClick={handleSendMessage}
                                    disabled={!newMessage.trim()}
                                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold p-4 rounded-2xl shadow-lg hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105"
                                >
                                    🚀
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'services':
                return (
                    <div className="flex-1 p-6">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                            🔍 Todos os Serviços
                        </h2>
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    🏠 Residencial
                                </h3>
                                <div className="space-y-3">
                                    <ServiceCard icon="🧹" title="Limpeza geral da casa" description="Limpeza completa de todos os cômodos" price="R$ 80/dia" />
                                    <ServiceCard icon="🏗️" title="Limpeza pós-obra" description="Remoção de entulho e poeira" price="R$ 150" />
                                    <ServiceCard icon="📦" title="Limpeza de mudança" description="Limpeza para entrega/recebimento" price="R$ 100" />
                                    <ServiceCard icon="🪟" title="Limpeza de vidros externos" description="Fachadas e janelas externas" price="R$ 50" />
                                </div>
                            </div>
                            
                            <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                                    🏢 Comercial
                                </h3>
                                <div className="space-y-3">
                                    <ServiceCard icon="💼" title="Limpeza de escritório" description="Ambiente corporativo completo" price="R$ 120/dia" />
                                    <ServiceCard icon="🏪" title="Limpeza de loja" description="Estabelecimentos comerciais" price="R$ 90/dia" />
                                    <ServiceCard icon="🏭" title="Limpeza industrial" description="Galpões e fábricas" price="Sob consulta" />
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl border border-blue-200">
                                <h3 className="text-lg font-bold text-gray-800 mb-2 flex items-center">
                                    ⭐ Pacotes Especiais
                                </h3>
                                <p className="text-gray-600 mb-4">Combine serviços e economize!</p>
                                <button 
                                    onClick={() => setScreen('chat')}
                                    className="bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-purple-700 transition-all"
                                >
                                    💬 Solicitar Orçamento
                                </button>
                            </div>
                        </div>
                    </div>
                );

            case 'profile':
                return (
                    <div className="flex-1 p-6">
                        <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                            👤 Meu Perfil
                        </h2>
                        <div className="space-y-6">
                            <div className="bg-white p-6 rounded-2xl shadow-lg">
                                <div className="text-center mb-6">
                                    <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg">
                                        <span className="text-white text-3xl font-bold">
                                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-gray-800">{user?.email || 'Usuário Anônimo'}</h3>
                                    <p className="text-gray-500">Cliente Firebase</p>
                                    <div className="flex items-center justify-center space-x-1 mt-2">
                                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                        <span className="text-sm text-green-600">Conectado ao Firebase</span>
                                    </div>
                                </div>
                                
                                <div className="space-y-3">
                                    <button className="w-full p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all transform hover:scale-105 border border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl">📧</span>
                                            <span className="font-semibold">Alterar email</span>
                                        </div>
                                    </button>
                                    <button className="w-full p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all transform hover:scale-105 border border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl">🔒</span>
                                            <span className="font-semibold">Alterar senha</span>
                                        </div>
                                    </button>
                                    <button className="w-full p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all transform hover:scale-105 border border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl">📱</span>
                                            <span className="font-semibold">Configurações</span>
                                        </div>
                                    </button>
                                    <button className="w-full p-4 text-left bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-gray-100 hover:to-gray-200 transition-all transform hover:scale-105 border border-gray-200">
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xl">ℹ️</span>
                                            <span className="font-semibold">Sobre o app</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            default:
                return <div className="flex-1 flex items-center justify-center text-gray-500">Tela não encontrada</div>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <div className="text-center">
                    <div className="text-6xl mb-4">🔥</div>
                    <p className="text-xl font-bold text-gray-700">Conectando ao Firebase...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-100">
            {/* Alert Message */}
            {alertMessage.show && (
                <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 text-white text-center px-6 py-3 rounded-xl shadow-lg z-50 max-w-sm ${
                    alertMessage.type === 'success' ? 'bg-green-500' :
                    alertMessage.type === 'error' ? 'bg-red-500' : 'bg-gray-800'
                }`}>
                    {alertMessage.text}
                </div>
            )}

            {/* Header */}
            <header className="bg-white shadow-lg p-4 flex justify-between items-center">
                <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600">Brasília, DF</span>
                    {user && <span className="text-xs text-gray-400">• Firebase</span>}
                </div>
                
                <div className="text-center">
                    <h1 className="text-xl font-bold text-gray-800">Latinas</h1>
                    <p className="text-xs text-gray-500">Serviços de Limpeza</p>
                </div>

                <div>
                    {user ? (
                        <button
                            onClick={handleLogout}
                            disabled={authLoading}
                            className="bg-red-500 text-white font-bold px-4 py-2 rounded-xl shadow-md hover:bg-red-600 transition duration-300 disabled:opacity-50"
                        >
                            {authLoading ? 'Saindo...' : 'Sair'}
                        </button>
                    ) : (
                        <button
                            onClick={() => setScreen('login')}
                            className="bg-blue-500 text-white font-bold px-4 py-2 rounded-xl shadow-md hover:bg-blue-600 transition duration-300"
                        >
                            Entrar
                        </button>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col">
                {renderScreen()}
            </main>

            {/* Bottom Navigation */}
            {user && (
                <nav className="bg-white shadow-lg p-4">
                    <div className="flex justify-around items-center max-w-md mx-auto">
                        <button 
                            onClick={() => setScreen('home')} 
                            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                                screen === 'home' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'
                            }`}
                        >
                            <span className="text-xl mb-1">🏠</span>
                            <span className="text-xs font-medium">Home</span>
                        </button>
                        
                        <button 
                            onClick={() => setScreen('services')} 
                            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                                screen === 'services' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'
                            }`}
                        >
                            <span className="text-xl mb-1">🔍</span>
                            <span className="text-xs font-medium">Serviços</span>
                        </button>
                        
                        <button 
                            onClick={() => setScreen('chat')} 
                            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                                screen === 'chat' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'
                            }`}
                        >
                            <span className="text-xl mb-1">💬</span>
                            <span className="text-xs font-medium">Chat</span>
                        </button>
                        
                        <button 
                            onClick={() => setScreen('profile')} 
                            className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                                screen === 'profile' ? 'text-blue-500 bg-blue-50' : 'text-gray-500 hover:text-blue-500'
                            }`}
                        >
                            <span className="text-xl mb-1">👤</span>
                            <span className="text-xs font-medium">Perfil</span>
                        </button>
                    </div>
                </nav>
            )}
        </div>
    );
};

export default App;