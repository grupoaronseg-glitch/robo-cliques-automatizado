@echo off
echo 🤖 INSTALANDO ROBO DE CLIQUES...

echo ⚙️ Instalando dependencias do backend...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt
cd ..

echo ⚙️ Instalando dependencias do frontend...
cd frontend
npm install
cd ..

echo ✅ Instalacao concluida!
echo.
echo 🚀 Para executar:
echo 1. Execute: executar_windows.bat
echo 2. Abra: http://localhost:3000
pause