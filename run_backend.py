#!/usr/bin/env python3
"""
Simple script to run the backend with Qdrant disabled
"""
import os
import sys

# Set environment variables
os.environ['QDRANT_ENABLED'] = 'false'

# Add backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

# Import and run the Flask app
from main import app

if __name__ == '__main__':
    print("Starting BA Agent Backend with Qdrant disabled...")
    print("Vector database features will not be available.")
    print("Backend will be available at: http://localhost:5000")
    app.run(debug=True, port=5000, host='0.0.0.0') 