import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent.parent.parent

# Chat history directory
CHAT_HISTORY_DIR = os.environ.get('CHAT_HISTORY_DIR', BASE_DIR / 'chat_history')

# Default providers
DEFAULT_TEXT_PROVIDER = os.environ.get('DEFAULT_TEXT_PROVIDER', 'openai')
DEFAULT_TEXT_MODEL = os.environ.get('DEFAULT_TEXT_MODEL', 'gpt-3.5-turbo')

DEFAULT_IMAGE_PROVIDER = os.environ.get('DEFAULT_IMAGE_PROVIDER', 'openai')
DEFAULT_IMAGE_MODEL = os.environ.get('DEFAULT_IMAGE_MODEL', 'dall-e-3')

DEFAULT_AUDIO_PROVIDER = os.environ.get('DEFAULT_AUDIO_PROVIDER', 'elevenlabs')
DEFAULT_AUDIO_MODEL = os.environ.get('DEFAULT_AUDIO_MODEL', 'eleven_multilingual_v2')

# Credentials file path
CREDENTIALS_FILE = os.environ.get('CREDENTIALS_FILE', BASE_DIR / 'credentials.json')

class Config:
    """Base configuration."""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-key-replace-in-production')
    DEBUG = os.environ.get('DEBUG', 'True').lower() in ('true', '1', 't')
    
    # Application settings
    BASE_DIR = BASE_DIR
    
    # Ollama settings
    SELECTOR_MODEL = os.environ.get('SELECTOR_MODEL', 'deepseek-r1')
    SELECTOR_MODEL_TAG = os.environ.get('SELECTOR_MODEL_TAG', '8b')
    
    # Media settings
    MAX_MEDIA_SIZE = int(os.environ.get('MAX_MEDIA_SIZE', 10 * 1024 * 1024))  # 10 MB
    
    # Model defaults
    DEFAULT_TEXT_PROVIDER = DEFAULT_TEXT_PROVIDER
    DEFAULT_TEXT_MODEL = DEFAULT_TEXT_MODEL
    
    DEFAULT_IMAGE_PROVIDER = DEFAULT_IMAGE_PROVIDER
    DEFAULT_IMAGE_MODEL = DEFAULT_IMAGE_MODEL
    
    DEFAULT_AUDIO_PROVIDER = DEFAULT_AUDIO_PROVIDER
    DEFAULT_AUDIO_MODEL = DEFAULT_AUDIO_MODEL 