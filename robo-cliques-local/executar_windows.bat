@echo off
echo 🤖 INICIANDO ROBO DE CLIQUES...

echo 🔧 Iniciando MongoDB...
net start MongoDB 2>nul

echo 🐍 Iniciando Backend...
start "Backend" cmd /k "cd backend && call venv\Scripts\activate.bat && python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload"

echo ⏰ Aguardando backend inicializar...
timeout /t 5 /nobreak >nul

echo ⚛️ Iniciando Frontend...
start "Frontend" cmd /k "cd frontend && npm start"

echo ✅ Sistema iniciado!
echo 📱 Abra: http://localhost:3000
echo ❌ Para parar: Feche as janelas do cmd
pause