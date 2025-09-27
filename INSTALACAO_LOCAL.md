# 🤖 ROBÔ DE CLIQUES - INSTALAÇÃO LOCAL

## 📋 PRÉ-REQUISITOS

### Windows:
1. **Python 3.8+**: https://python.org/downloads
2. **Node.js 16+**: https://nodejs.org/downloads  
3. **MongoDB**: https://www.mongodb.com/try/download/community
4. **Git**: https://git-scm.com/downloads

### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install python3 python3-pip nodejs npm mongodb git chromium-browser
```

### macOS:
```bash
# Instale Homebrew primeiro: https://brew.sh
brew install python node mongodb/brew/mongodb-community chromium
```

## 📁 ESTRUTURA DO PROJETO

Crie uma pasta e organize assim:
```
robo-cliques/
├── backend/
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── App.css
│   │   └── index.js
│   ├── package.json
│   ├── tailwind.config.js
│   └── postcss.config.js
└── README.md
```

## ⚙️ INSTALAÇÃO PASSO A PASSO

### 1. **Configurar Backend (Python/FastAPI)**

```bash
cd robo-cliques/backend

# Criar ambiente virtual
python -m venv venv

# Ativar ambiente (Windows)
venv\Scripts\activate

# Ativar ambiente (Linux/Mac)  
source venv/bin/activate

# Instalar dependências
pip install -r requirements.txt
```

### 2. **Configurar Frontend (React)**

```bash
cd ../frontend

# Instalar dependências
npm install
# ou
yarn install
```

### 3. **Configurar MongoDB**

**Windows:**
- Inicie o MongoDB Compass ou serviço
- URL padrão: `mongodb://localhost:27017`

**Linux/Mac:**
```bash
# Iniciar MongoDB
sudo systemctl start mongod
# ou
brew services start mongodb-community
```

### 4. **Configurar Variáveis de Ambiente**

**backend/.env:**
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=robo_cliques
CORS_ORIGINS=http://localhost:3000
```

**frontend/.env:**
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## 🏃‍♂️ EXECUTAR O SISTEMA

### 1. **Iniciar Backend:**
```bash
cd backend
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### 2. **Iniciar Frontend (nova aba do terminal):**
```bash
cd frontend  
npm start
# ou
yarn start
```

### 3. **Acessar a Interface:**
- Abra: http://localhost:3000
- Backend API: http://localhost:8001

## 🎯 COMO USAR

1. **Adicione suas URLs** no campo de entrada
2. **Configure o intervalo** entre cliques (padrão: 5 segundos)
3. **Clique "Iniciar Robô"** para começar
4. **Acompanhe os logs** em tempo real
5. **Clique "Parar Robô"** quando quiser parar

## 🔧 SOLUÇÃO DE PROBLEMAS

### **Chrome/Chromium não encontrado:**
- Windows: Instale Google Chrome
- Linux: `sudo apt install chromium-browser`
- Mac: `brew install chromium`

### **Erro de proxy:**
- O robô funciona sem proxy se não conseguir conectar
- Proxies gratuitos podem ser instáveis

### **Erro de MongoDB:**
- Verifique se o MongoDB está rodando
- Teste a conexão: `mongo mongodb://localhost:27017`

### **Porta em uso:**
- Mude as portas no código se necessário
- Backend: porta 8001
- Frontend: porta 3000

## 📱 EXECUTAR EM PRODUÇÃO

Para usar em servidor/produção:
```bash
# Backend com Gunicorn
pip install gunicorn
gunicorn -w 4 -k uvicorn.workers.UvicornWorker server:app --bind 0.0.0.0:8001

# Frontend build
npm run build
# Servir com nginx ou similar
```

## 🚨 AVISOS IMPORTANTES

- ⚖️ Use apenas em sites que você tem permissão
- 🛡️ Alguns sites podem bloquear bots
- ⏱️ Respeite rate limits dos sites
- 🔄 Proxies gratuitos podem ser lentos/instáveis