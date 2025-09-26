import { useState, useEffect, useRef } from "react";
import "./App.css";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ClickRobotApp = () => {
  const [targets, setTargets] = useState([]);
  const [robotStatus, setRobotStatus] = useState({
    is_running: false,
    clicks_made: 0,
    current_proxy: null,
    last_click_time: null,
    error_message: null
  });
  const [config, setConfig] = useState({
    interval_seconds: 5,
    max_clicks: null,
    enabled: false
  });
  const [newTarget, setNewTarget] = useState({ url: "", name: "" });
  const [logs, setLogs] = useState([]);
  const [connected, setConnected] = useState(false);
  
  const wsRef = useRef(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    loadTargets();
    loadRobotStatus();
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const connectWebSocket = () => {
    const wsUrl = BACKEND_URL.replace('http', 'ws') + '/ws/logs';
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setConnected(true);
      addLog('🔗 Conectado ao sistema de logs', 'success');
    };
    
    wsRef.current.onmessage = (event) => {
      const logData = JSON.parse(event.data);
      addLog(logData.message, logData.level, logData.timestamp);
      
      // Atualiza status com dados do log
      setRobotStatus(prev => ({
        ...prev,
        clicks_made: logData.clicks_made,
        current_proxy: logData.current_proxy
      }));
    };
    
    wsRef.current.onclose = () => {
      setConnected(false);
      addLog('❌ Desconectado do sistema de logs', 'error');
      
      // Tenta reconectar após 3 segundos
      setTimeout(() => {
        if (!connected) {
          connectWebSocket();
        }
      }, 3000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      addLog('❌ Erro na conexão com logs', 'error');
    };
  };

  const addLog = (message, level = 'info', timestamp = null) => {
    const log = {
      id: Date.now(),
      message,
      level,
      timestamp: timestamp || new Date().toISOString()
    };
    
    setLogs(prev => [...prev.slice(-99), log]); // Keep last 100 logs
  };

  const loadTargets = async () => {
    try {
      const response = await axios.get(`${API}/robot/targets`);
      setTargets(response.data);
    } catch (error) {
      console.error('Erro ao carregar targets:', error);
      addLog('❌ Erro ao carregar URLs', 'error');
    }
  };

  const loadRobotStatus = async () => {
    try {
      const response = await axios.get(`${API}/robot/status`);
      setRobotStatus(response.data);
    } catch (error) {
      console.error('Erro ao carregar status:', error);
    }
  };

  const addTarget = async () => {
    if (!newTarget.url.trim()) {
      alert('Por favor, insira uma URL válida');
      return;
    }

    try {
      await axios.post(`${API}/robot/targets`, newTarget);
      setNewTarget({ url: "", name: "" });
      await loadTargets();
      addLog(`✅ URL adicionada: ${newTarget.url}`, 'success');
    } catch (error) {
      console.error('Erro ao adicionar target:', error);
      addLog('❌ Erro ao adicionar URL', 'error');
    }
  };

  const deleteTarget = async (targetId) => {
    try {
      await axios.delete(`${API}/robot/targets/${targetId}`);
      await loadTargets();
      addLog('🗑️ URL removida', 'info');
    } catch (error) {
      console.error('Erro ao deletar target:', error);
      addLog('❌ Erro ao remover URL', 'error');
    }
  };

  const startRobot = async () => {
    if (targets.length === 0) {
      alert('Adicione pelo menos uma URL antes de iniciar o robô');
      return;
    }

    try {
      await axios.post(`${API}/robot/start`, config);
      await loadRobotStatus();
      addLog('🚀 Robô iniciado!', 'success');
    } catch (error) {
      console.error('Erro ao iniciar robô:', error);
      addLog('❌ Erro ao iniciar robô', 'error');
    }
  };

  const stopRobot = async () => {
    try {
      await axios.post(`${API}/robot/stop`);
      await loadRobotStatus();
      addLog('⏹️ Robô parado', 'info');
    } catch (error) {
      console.error('Erro ao parar robô:', error);
      addLog('❌ Erro ao parar robô', 'error');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Nunca';
    return new Date(timestamp).toLocaleTimeString('pt-BR');
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'success': return 'text-green-600';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">🤖 Robô de Cliques</h1>
          <p className="text-gray-600">Sistema automatizado de cliques com rotação de IP</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel de Controle */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Status do Robô</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Status</div>
                  <div className={`font-semibold ${robotStatus.is_running ? 'text-green-600' : 'text-gray-600'}`}>
                    {robotStatus.is_running ? '🟢 Executando' : '🔴 Parado'}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Cliques Feitos</div>
                  <div className="font-semibold text-blue-600">{robotStatus.clicks_made}</div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded col-span-2">
                  <div className="text-sm text-gray-600">Proxy Atual</div>
                  <div className="font-mono text-sm">
                    {robotStatus.current_proxy || 'Sem proxy'}
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded col-span-2">
                  <div className="text-sm text-gray-600">Último Clique</div>
                  <div className="font-semibold">{formatTime(robotStatus.last_click_time)}</div>
                </div>
              </div>

              {robotStatus.error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-3 mb-4">
                  <div className="text-red-800 text-sm">{robotStatus.error_message}</div>
                </div>
              )}

              <div className="flex gap-2">
                {!robotStatus.is_running ? (
                  <button
                    onClick={startRobot}
                    data-testid="start-robot-btn"
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center gap-2"
                  >
                    🚀 Iniciar Robô
                  </button>
                ) : (
                  <button
                    onClick={stopRobot}
                    data-testid="stop-robot-btn"
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded flex items-center gap-2"
                  >
                    ⏹️ Parar Robô
                  </button>
                )}
              </div>
            </div>

            {/* Configurações */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">Configurações</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intervalo entre cliques (segundos)
                  </label>
                  <input
                    type="number"
                    value={config.interval_seconds}
                    onChange={(e) => setConfig(prev => ({ ...prev, interval_seconds: parseInt(e.target.value) || 5 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="300"
                    data-testid="interval-input"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Máximo de cliques (deixe vazio para infinito)
                  </label>
                  <input
                    type="number"
                    value={config.max_clicks || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, max_clicks: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Infinito"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    data-testid="max-clicks-input"
                  />
                </div>
              </div>
            </div>

            {/* Gerenciar URLs */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-semibold mb-4">URLs de Destino</h2>
              
              <div className="space-y-4 mb-4">
                <input
                  type="url"
                  placeholder="https://exemplo.com"
                  value={newTarget.url}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="url-input"
                />
                
                <input
                  type="text"
                  placeholder="Nome (opcional)"
                  value={newTarget.name}
                  onChange={(e) => setNewTarget(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  data-testid="name-input"
                />
                
                <button
                  onClick={addTarget}
                  data-testid="add-target-btn"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  ➕ Adicionar URL
                </button>
              </div>

              <div className="space-y-2">
                {targets.length === 0 ? (
                  <div className="text-gray-500 text-center py-4">
                    Nenhuma URL configurada
                  </div>
                ) : (
                  targets.map((target) => (
                    <div key={target.id} className="flex items-center justify-between bg-gray-50 p-3 rounded" data-testid={`target-item-${target.id}`}>
                      <div>
                        <div className="font-medium text-sm">
                          {target.name || 'Sem nome'}
                        </div>
                        <div className="text-gray-600 text-xs font-mono truncate">
                          {target.url}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteTarget(target.id)}
                        data-testid={`delete-target-${target.id}`}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Remover"
                      >
                        🗑️
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Logs em Tempo Real */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Logs em Tempo Real</h2>
              <div className={`flex items-center gap-2 text-sm ${connected ? 'text-green-600' : 'text-red-600'}`}>
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {connected ? 'Conectado' : 'Desconectado'}
              </div>
            </div>
            
            <div className="h-96 overflow-y-auto bg-gray-50 rounded p-4 font-mono text-sm" data-testid="logs-container">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center">
                  Aguardando logs...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className={`mb-2 ${getLogColor(log.level)}`} data-testid={`log-${log.id}`}>
                    <span className="text-gray-500">
                      [{new Date(log.timestamp).toLocaleTimeString('pt-BR')}]
                    </span>{' '}
                    {log.message}
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
            
            <button
              onClick={() => setLogs([])}
              className="mt-2 text-gray-600 hover:text-gray-800 text-sm"
              data-testid="clear-logs-btn"
            >
              🗑️ Limpar Logs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <ClickRobotApp />
    </div>
  );
}

export default App;