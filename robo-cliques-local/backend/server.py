from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import json
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime
import requests
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, WebDriverException
import chromedriver_autoinstaller
from fake_useragent import UserAgent
import random
import time
import threading

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Global variables para o robô
robot_instance = None
robot_running = False
websocket_connections = []

# Models
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class StatusCheckCreate(BaseModel):
    client_name: str

class ClickTarget(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    name: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ClickTargetCreate(BaseModel):
    url: str
    name: str = ""

class RobotConfig(BaseModel):
    interval_seconds: int = 5
    max_clicks: Optional[int] = None
    enabled: bool = False

class RobotStatus(BaseModel):
    is_running: bool
    clicks_made: int
    current_proxy: Optional[str]
    last_click_time: Optional[datetime]
    error_message: Optional[str]

# Classe principal do robô
class ClickRobot:
    def __init__(self):
        self.running = False
        self.clicks_made = 0
        self.current_proxy = None
        self.last_click_time = None
        self.error_message = None
        self.proxies = []
        self.current_proxy_index = 0
        self.ua = UserAgent()
        
    async def log_message(self, message: str, level: str = "info"):
        """Envia mensagem para todos os websockets conectados"""
        log_data = {
            "timestamp": datetime.now().isoformat(),
            "level": level,
            "message": message,
            "clicks_made": self.clicks_made,
            "current_proxy": self.current_proxy
        }
        
        # Envia para todos os websockets conectados
        disconnected = []
        for websocket in websocket_connections:
            try:
                await websocket.send_text(json.dumps(log_data))
            except:
                disconnected.append(websocket)
        
        # Remove conexões desconectadas
        for ws in disconnected:
            if ws in websocket_connections:
                websocket_connections.remove(ws)
    
    def get_free_proxies(self):
        """Obtém lista de proxies gratuitos"""
        try:
            # Fonte de proxies gratuitos
            response = requests.get('https://www.proxy-list.download/api/v1/get?type=http', timeout=10)
            if response.status_code == 200:
                proxies = response.text.strip().split('\n')
                return [f"http://{proxy.strip()}" for proxy in proxies if proxy.strip()]
            return []
        except Exception as e:
            print(f"Erro ao obter proxies: {e}")
            return []
    
    def test_proxy(self, proxy):
        """Testa se o proxy está funcionando"""
        try:
            response = requests.get('http://httpbin.org/ip', 
                                  proxies={'http': proxy, 'https': proxy}, 
                                  timeout=10)
            return response.status_code == 200
        except:
            return False
    
    def get_next_proxy(self):
        """Obtém o próximo proxy da lista"""
        if not self.proxies:
            self.proxies = self.get_free_proxies()
            self.current_proxy_index = 0
        
        if self.proxies:
            # Tenta proxies até encontrar um que funcione
            attempts = 0
            while attempts < len(self.proxies):
                proxy = self.proxies[self.current_proxy_index]
                self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxies)
                
                if self.test_proxy(proxy):
                    self.current_proxy = proxy
                    return proxy
                
                attempts += 1
            
        # Se nenhum proxy funcionar, usar sem proxy
        self.current_proxy = None
        return None
    
    def create_driver(self, proxy=None):
        """Cria uma instância do Chrome WebDriver"""
        try:
            # Install chromedriver automatically
            chromedriver_autoinstaller.install()
            
            options = Options()
            options.add_argument('--headless')
            options.add_argument('--no-sandbox')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--disable-gpu')
            options.add_argument('--window-size=1920,1080')
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_experimental_option("excludeSwitches", ["enable-automation"])
            options.add_experimental_option('useAutomationExtension', False)
            options.add_argument(f'--user-agent={self.ua.random}')
            
            # Try to use system chromium
            try:
                options.binary_location = '/usr/bin/chromium'
            except:
                pass
            
            if proxy:
                options.add_argument(f'--proxy-server={proxy}')
            
            driver = webdriver.Chrome(options=options)
            driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            driver.set_page_load_timeout(30)
            return driver
            
        except Exception as e:
            raise Exception(f"Erro ao criar driver: {e}")
    
    async def click_url(self, url: str):
        """Realiza um clique em uma URL específica"""
        driver = None
        try:
            # Obtém novo proxy para este clique
            proxy = self.get_next_proxy()
            await self.log_message(f"🔄 Usando proxy: {proxy if proxy else 'Sem proxy'}")
            
            # Cria driver com o proxy
            await self.log_message(f"🌐 Criando navegador...")
            driver = self.create_driver(proxy)
            
            # Navega para a URL
            await self.log_message(f"📡 Navegando para: {url}")
            driver.get(url)
            
            # Aguarda página carregar completamente
            await self.log_message(f"⏳ Página carregando...")
            await asyncio.sleep(3)
            
            # Simula comportamento humano - scroll aleatório
            driver.execute_script("window.scrollTo(0, Math.floor(Math.random() * 500));")
            
            # Aguarda 2 segundos para parecer natural (como solicitado)
            await self.log_message(f"👤 Simulando comportamento humano...")
            await asyncio.sleep(2)
            
            self.clicks_made += 1
            self.last_click_time = datetime.now()
            await self.log_message(f"✅ Clique #{self.clicks_made} realizado com sucesso em {url}")
            
        except Exception as e:
            self.error_message = str(e)
            await self.log_message(f"❌ Erro no clique: {e}", "error")
            
        finally:
            if driver:
                try:
                    driver.quit()
                    await self.log_message(f"🔒 Navegador fechado")
                except:
                    pass
    
    async def run(self, targets: List[ClickTarget], config: RobotConfig):
        """Loop principal do robô"""
        self.running = True
        self.clicks_made = 0
        self.error_message = None
        
        await self.log_message("🤖 Robô iniciado!")
        
        try:
            while self.running:
                if not targets:
                    await self.log_message("⚠️ Nenhuma URL configurada", "warning")
                    break
                
                # Seleciona URL aleatória da lista
                target = random.choice(targets)
                
                await self.click_url(target.url)
                
                # Verifica se atingiu limite máximo
                if config.max_clicks and self.clicks_made >= config.max_clicks:
                    await self.log_message(f"✋ Limite de {config.max_clicks} cliques atingido!")
                    break
                
                # Aguarda intervalo antes do próximo clique
                if self.running:
                    await self.log_message(f"⏳ Aguardando {config.interval_seconds} segundos...")
                    await asyncio.sleep(config.interval_seconds)
                
        except Exception as e:
            self.error_message = str(e)
            await self.log_message(f"❌ Erro no robô: {e}", "error")
        
        finally:
            self.running = False
            await self.log_message("🛑 Robô parado!")
    
    def stop(self):
        """Para o robô"""
        self.running = False

# Instância global do robô
robot_instance = ClickRobot()

# WebSocket para logs em tempo real
@app.websocket("/ws/logs")
async def websocket_logs(websocket: WebSocket):
    await websocket.accept()
    websocket_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        websocket_connections.remove(websocket)

# APIs originais
@api_router.get("/")
async def root():
    return {"message": "Robô de Cliques API"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# APIs do Robô de Cliques
@api_router.post("/robot/targets", response_model=ClickTarget)
async def add_target(target: ClickTargetCreate):
    """Adiciona uma nova URL alvo"""
    target_dict = target.dict()
    target_obj = ClickTarget(**target_dict)
    await db.click_targets.insert_one(target_obj.dict())
    return target_obj

@api_router.get("/robot/targets", response_model=List[ClickTarget])
async def get_targets():
    """Lista todas as URLs alvo"""
    targets = await db.click_targets.find().to_list(1000)
    return [ClickTarget(**target) for target in targets]

@api_router.delete("/robot/targets/{target_id}")
async def delete_target(target_id: str):
    """Remove uma URL alvo"""
    result = await db.click_targets.delete_one({"id": target_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Target não encontrado")
    return {"message": "Target removido com sucesso"}

@api_router.post("/robot/start")
async def start_robot(config: RobotConfig):
    """Inicia o robô de cliques"""
    global robot_running
    
    if robot_running:
        raise HTTPException(status_code=400, detail="Robô já está executando")
    
    targets = await get_targets()
    if not targets:
        raise HTTPException(status_code=400, detail="Nenhuma URL configurada")
    
    robot_running = True
    
    # Reseta o estado do robô
    robot_instance.running = False
    robot_instance.clicks_made = 0
    robot_instance.error_message = None
    
    # Inicia robô em thread separada
    def run_robot():
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(robot_instance.run(targets, config))
        except Exception as e:
            print(f"Erro no thread do robô: {e}")
        finally:
            global robot_running
            robot_running = False
    
    thread = threading.Thread(target=run_robot, daemon=True)
    thread.start()
    
    return {"message": "Robô iniciado com sucesso"}

@api_router.post("/robot/stop")
async def stop_robot():
    """Para o robô de cliques"""
    global robot_running
    
    if not robot_running:
        raise HTTPException(status_code=400, detail="Robô não está executando")
    
    robot_instance.stop()
    robot_running = False
    
    return {"message": "Robô parado com sucesso"}

@api_router.get("/robot/status", response_model=RobotStatus)
async def get_robot_status():
    """Obtém status atual do robô"""
    return RobotStatus(
        is_running=robot_running,
        clicks_made=robot_instance.clicks_made,
        current_proxy=robot_instance.current_proxy,
        last_click_time=robot_instance.last_click_time,
        error_message=robot_instance.error_message
    )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()