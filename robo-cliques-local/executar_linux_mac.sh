#!/bin/bash
echo "🤖 INICIANDO ROBÔ DE CLIQUES..."

echo "🔧 Verificando MongoDB..."
if ! pgrep mongod > /dev/null; then
    echo "Iniciando MongoDB..."
    sudo systemctl start mongod 2>/dev/null || brew services start mongodb-community 2>/dev/null
fi

echo "🐍 Iniciando Backend..."
cd backend
source venv/bin/activate
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!
cd ..

echo "⏰ Aguardando backend inicializar..."
sleep 5

echo "⚛️ Iniciando Frontend..."
cd frontend
npm start &
FRONTEND_PID=$!
cd ..

echo "✅ Sistema iniciado!"
echo "📱 Abra: http://localhost:3000"
echo "❌ Para parar: Ctrl+C"

# Aguardar Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait