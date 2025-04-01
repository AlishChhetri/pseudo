"""Application configuration settings and environment variable handling."""

import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Base directory
base_dir = Path(__file__).parent.parent.parent

# Chat history directory
chat_history_dir = os.environ.get("CHAT_HISTORY_DIR", base_dir / "chat_history")

# Credentials file path
credentials_file = os.environ.get("CREDENTIALS_FILE", base_dir / "credentials.json")


class Config:
    """Base configuration class for application settings."""

    # Flask settings
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-key-replace-in-production")
    DEBUG = os.environ.get("DEBUG", "True").lower() in ("true", "1", "t")  #  Controls debug mode

    # Application settings
    BASE_DIR = base_dir
    CHAT_HISTORY_DIR = chat_history_dir
    CREDENTIALS_FILE = credentials_file

    # Ollama settings for content detection
    SELECTOR_MODEL = os.environ.get(
        "SELECTOR_MODEL", "deepseek-r1"
    )  #  Model used for content routing
    SELECTOR_MODEL_TAG = os.environ.get(
        "SELECTOR_MODEL_TAG", "8b"
    )  #  Size/tag of the selector model

    # Media settings
    MAX_MEDIA_SIZE = int(os.environ.get("MAX_MEDIA_SIZE", 10 * 1024 * 1024))  #  10 MB
