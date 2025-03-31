"""Application configuration settings and environment variable handling."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Base directory
BASE_DIR = Path(__file__).parent.parent.parent

# Chat history directory
CHAT_HISTORY_DIR = os.environ.get("CHAT_HISTORY_DIR", BASE_DIR / "chat_history")

# Credentials file path
CREDENTIALS_FILE = os.environ.get("CREDENTIALS_FILE", BASE_DIR / "credentials.json")


class Config:
    """Base configuration class for application settings."""

    # Flask settings
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-replace-in-production")
    DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "t")

    # Application settings
    BASE_DIR = BASE_DIR
    CHAT_HISTORY_DIR = CHAT_HISTORY_DIR
    CREDENTIALS_FILE = CREDENTIALS_FILE

    # Ollama settings for content detection
    SELECTOR_MODEL = os.environ.get("SELECTOR_MODEL", "deepseek-r1")
    SELECTOR_MODEL_TAG = os.environ.get("SELECTOR_MODEL_TAG", "8b")

    # Media settings
    MAX_MEDIA_SIZE = int(os.environ.get("MAX_MEDIA_SIZE", 10 * 1024 * 1024))  # 10 MB
