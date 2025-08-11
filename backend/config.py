# config.py
# Configuration settings for the BA Agent

import os
from dotenv import load_dotenv, find_dotenv
from docx import Document as DocxDocument

# Load environment variables (handle potential Windows BOM/UTF-16 encodings)
try:
    dotenv_path = find_dotenv(usecwd=True)
    if dotenv_path:
        try:
            # utf-8-sig gracefully handles UTF-8 with BOM on Windows
            load_dotenv(dotenv_path=dotenv_path, encoding="utf-8-sig")
        except UnicodeDecodeError:
            # Fallback for files saved with UTF-16 BOM (common on Windows Notepad)
            load_dotenv(dotenv_path=dotenv_path, encoding="utf-16")
    else:
        load_dotenv()
except Exception as env_exc:
    print(f"WARNING: Failed to load .env file: {env_exc}")

# Database Configuration
# Example for PostgreSQL:
# DATABASE_URL = 'postgresql+psycopg2://username:password@host:port/dbname'
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg2://user:pass@host:5432/dbname')

# Qdrant Vector Database Configuration
QDRANT_HOST = os.getenv('QDRANT_HOST', 'localhost')
QDRANT_PORT = int(os.getenv('QDRANT_PORT', 6333))

# Azure Configuration (set via environment in production)
ACS_CONNECTION_STRING = os.getenv('ACS_CONNECTION_STRING', '')
ACS_SENDER_ADDRESS = os.getenv('ACS_SENDER_ADDRESS', '')
APPROVAL_RECIPIENT_EMAIL = os.getenv('APPROVAL_RECIPIENT_EMAIL', '')
BACKEND_BASE_URL = os.getenv('BACKEND_BASE_URL', 'http://127.0.0.1:5000')
ADO_ORGANIZATION_URL = os.getenv('ADO_ORGANIZATION_URL', '')
ADO_PROJECT_NAME = os.getenv('ADO_PROJECT_NAME', '')
# Azure DevOps Personal Access Token - set via env
ADO_PAT = os.getenv('ADO_PERSONAL_ACCESS_TOKEN', '')

# Gemini API Key
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Avoid printing sensitive keys in production
if os.getenv('ENVIRONMENT', 'production').lower() != 'production':
    print(f"DEBUG: Using Gemini API key: {GEMINI_API_KEY[:6]}***")