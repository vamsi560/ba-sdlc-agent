#!/usr/bin/env python3
"""
Test script to debug database URL issues
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

print("=== Database URL Debug ===")
print(f"Environment DATABASE_URL: {os.getenv('DATABASE_URL')}")

# Test the default URL
default_url = 'postgresql+psycopg2://bauser:Valuemomentum123@baagent.postgres.database.azure.com:5432/ba_agent'
print(f"Default URL: {default_url}")

# Test URL parsing
try:
    from sqlalchemy import create_engine
    engine = create_engine(default_url)
    print("✅ Database URL is valid!")
except Exception as e:
    print(f"❌ Database URL error: {e}")

print("=== End Debug ===")
