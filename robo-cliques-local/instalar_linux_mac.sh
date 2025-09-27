#!/bin/bash
echo "🤖 INSTALANDO ROBÔ DE CLIQUES..."

echo "⚙️ Instalando dependências do backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd ..

echo "⚙️ Instalando dependências do frontend..."
cd frontend
npm install
cd ..

echo "✅ Instalação concluída!"
echo ""
echo "🚀 Para executar:"
echo "1. Execute: ./executar_linux_mac.sh"
echo "2. Abra: http://localhost:3000"