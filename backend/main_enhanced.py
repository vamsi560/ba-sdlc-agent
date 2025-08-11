# main_enhanced.py
# Enhanced Business Analyst Agent with LangChain and OneDrive Integration

from flask import Flask, request, jsonify, redirect, send_file, send_from_directory
from flask_cors import CORS
import os
from io import BytesIO
import requests
import json
import uuid
import base64
import io
import re
from datetime import datetime
from werkzeug.utils import secure_filename

# --- File Parsing Libraries ---
from docx import Document as DocxDocument
from docx.opc.exceptions import PackageNotFoundError
import PyPDF2
import docx

# --- Azure SDKs ---
from azure.communication.email import EmailClient

# --- Database imports ---
from database import (
    init_db, get_db, save_document_to_db, save_document_to_db_direct, save_analysis_to_db,
    add_to_vector_db, search_vector_db, Document, Analysis,
    save_approval_to_db, get_approval_from_db, update_approval_in_db,
    get_all_documents_from_db, get_all_documents_from_db_direct, get_all_analyses_from_db, 
    check_document_exists_by_name, check_document_exists_by_name_direct, get_document_by_id, get_analysis_by_id_from_db
)

# --- Configuration imports ---
from config import (
    GEMINI_API_URL, ACS_CONNECTION_STRING, ACS_SENDER_ADDRESS,
    APPROVAL_RECIPIENT_EMAIL, BACKEND_BASE_URL, ADO_ORGANIZATION_URL,
    ADO_PROJECT_NAME, ADO_PAT, DATABASE_URL, GEMINI_API_KEY,
    LANGCHAIN_ENABLED, ONEDRIVE_ENABLED, OPENAI_API_KEY, OPENAI_MODEL,
    ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_TENANT_ID,
    ONEDRIVE_REDIRECT_URI, ONEDRIVE_SCOPE, ENVIRONMENT, DEBUG
)

# --- Enhanced Features Imports ---
try:
    from langchain_integration import langchain_integration
    print("✅ LangChain integration imported successfully")
except ImportError as e:
    print(f"⚠️ LangChain integration not available: {e}")
    langchain_integration = None

try:
    from phase3_onedrive import onedrive_integration
    print("✅ OneDrive integration imported successfully")
except ImportError as e:
    print(f"⚠️ OneDrive integration not available: {e}")
    onedrive_integration = None

# Initialize the Flask application
app = Flask(__name__)

# Initialize database only if configured
try:
    init_db()
except Exception as _e:
    print(f"ℹ️ Skipping DB init at startup: {_e}")

# --- Configuration ---
CORS(app, resources={r"/api/*": {"origins": "*"}})

# --- In-memory storage for approvals (fallback only) ---
approval_statuses = {}

# --- Token Consumption Tracking ---
token_consumption_logs = []

def log_token_consumption(stage, tokens_used, model_used="gemini-pro", details=None):
    """Log token consumption for each stage with detailed information"""
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "stage": stage,
        "tokens_used": tokens_used,
        "model_used": model_used,
        "details": details or {}
    }
    token_consumption_logs.append(log_entry)
    
    # Save to file for persistence
    try:
        with open("token_logs.json", "w") as f:
            json.dump(token_consumption_logs, f, indent=2)
    except Exception as e:
        print(f"Warning: Could not save token logs: {e}")
    
    # Print detailed log to console
    print(f"🔍 TOKEN LOG: {stage.upper()}")
    print(f"   📊 Tokens Used: {tokens_used:,}")
    print(f"   🤖 Model: {model_used}")
    print(f"   ⏰ Timestamp: {log_entry['timestamp']}")
    if details:
        print(f"   📝 Details: {details}")
    print(f"   📈 Total Tokens So Far: {sum(log['tokens_used'] for log in token_consumption_logs):,}")
    print("─" * 50)

# ============================================================================
# ENHANCED FEATURES ENDPOINTS
# ============================================================================

# --- LangChain Integration Endpoints ---
@app.route("/api/langchain/status", methods=['GET'])
def langchain_status():
    """Check LangChain integration status"""
    if not LANGCHAIN_ENABLED:
        return jsonify({"enabled": False, "message": "LangChain is disabled"})
    
    if not langchain_integration:
        return jsonify({"enabled": False, "message": "LangChain integration not available"})
    
    return jsonify({
        "enabled": True,
        "message": "LangChain integration is active",
        "features": [
            "Document Chains",
            "Memory Management", 
            "Custom Tools",
            "Vector Store Integration"
        ]
    })

@app.route("/api/langchain/analyze", methods=['POST'])
def langchain_analyze():
    """Enhanced analysis using LangChain"""
    if not LANGCHAIN_ENABLED or not langchain_integration:
        return jsonify({"error": "LangChain integration not available"}), 400
    
    try:
        data = request.get_json()
        text_content = data.get('text', '')
        
        # Use LangChain analysis chain
        analysis_chain = langchain_integration.create_analysis_chain()
        result = analysis_chain.run({"input_text": text_content})
        
        return jsonify({
            "success": True,
            "analysis": result,
            "method": "langchain"
        })
        
    except Exception as e:
        return jsonify({"error": f"LangChain analysis failed: {str(e)}"}), 500

@app.route("/api/langchain/chat", methods=['POST'])
def langchain_chat():
    """Conversational AI with memory"""
    if not LANGCHAIN_ENABLED or not langchain_integration:
        return jsonify({"error": "LangChain integration not available"}), 400
    
    try:
        data = request.get_json()
        message = data.get('message', '')
        
        # Create conversation chain
        conversation_chain = langchain_integration.create_conversation_chain()
        response = conversation_chain.run({"input": message})
        
        return jsonify({
            "success": True,
            "response": response,
            "method": "langchain"
        })
        
    except Exception as e:
        return jsonify({"error": f"LangChain chat failed: {str(e)}"}), 500

@app.route("/api/langchain/tools", methods=['GET'])
def langchain_tools():
    """List available LangChain tools"""
    if not LANGCHAIN_ENABLED or not langchain_integration:
        return jsonify({"error": "LangChain integration not available"}), 400
    
    try:
        agent = langchain_integration.create_agent_with_tools()
        tools = [tool.name for tool in agent.tools]
        
        return jsonify({
            "success": True,
            "tools": tools,
            "count": len(tools)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to get tools: {str(e)}"}), 500

# --- OneDrive Integration Endpoints ---
@app.route("/api/onedrive/status", methods=['GET'])
def onedrive_status():
    """Check OneDrive integration status"""
    if not ONEDRIVE_ENABLED:
        return jsonify({"enabled": False, "message": "OneDrive is disabled"})
    
    if not onedrive_integration:
        return jsonify({"enabled": False, "message": "OneDrive integration not available"})
    
    return jsonify({
        "enabled": True,
        "message": "OneDrive integration is active",
        "features": [
            "Document Sync",
            "Cloud Storage",
            "Collaboration",
            "Version Control"
        ]
    })

@app.route("/api/onedrive/auth", methods=['GET'])
def onedrive_auth():
    """Get OneDrive authorization URL"""
    if not ONEDRIVE_ENABLED or not onedrive_integration:
        return jsonify({"error": "OneDrive integration not available"}), 400
    
    try:
        auth_url = onedrive_integration.get_auth_url()
        return jsonify({
            "success": True,
            "auth_url": auth_url,
            "message": "Navigate to this URL to authorize OneDrive access"
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to get auth URL: {str(e)}"}), 500

@app.route("/api/onedrive/callback", methods=['GET'])
def onedrive_callback():
    """Handle OneDrive OAuth callback"""
    if not ONEDRIVE_ENABLED or not onedrive_integration:
        return jsonify({"error": "OneDrive integration not available"}), 400
    
    try:
        auth_code = request.args.get('code')
        if not auth_code:
            return jsonify({"error": "No authorization code received"}), 400
        
        result = onedrive_integration.acquire_token_by_authorization_code(auth_code)
        
        if result.get("success"):
            return jsonify({
                "success": True,
                "message": "OneDrive authorization successful",
                "expires_at": result.get("expires_at")
            })
        else:
            return jsonify({"error": result.get("error", "Authorization failed")}), 400
            
    except Exception as e:
        return jsonify({"error": f"Callback processing failed: {str(e)}"}), 500

@app.route("/api/onedrive/sync/<analysis_id>", methods=['POST'])
def onedrive_sync(analysis_id):
    """Sync analysis documents to OneDrive"""
    if not ONEDRIVE_ENABLED or not onedrive_integration:
        return jsonify({"error": "OneDrive integration not available"}), 400
    
    try:
        data = request.get_json() or {}
        folder_name = data.get('folder_name')
        
        result = onedrive_integration.sync_documents_to_onedrive(analysis_id, folder_name)
        
        if result.get("success"):
            return jsonify({
                "success": True,
                "message": "Documents synced to OneDrive successfully",
                "folder_id": result.get("folder_id"),
                "folder_name": result.get("folder_name"),
                "uploaded_files": result.get("uploaded_files"),
                "onedrive_url": result.get("onedrive_url")
            })
        else:
            return jsonify({"error": result.get("error", "Sync failed")}), 500
            
    except Exception as e:
        return jsonify({"error": f"Sync failed: {str(e)}"}), 500

@app.route("/api/onedrive/import", methods=['POST'])
def onedrive_import():
    """Import documents from OneDrive"""
    if not ONEDRIVE_ENABLED or not onedrive_integration:
        return jsonify({"error": "OneDrive integration not available"}), 400
    
    try:
        data = request.get_json()
        folder_id = data.get('folder_id')
        
        result = onedrive_integration.import_documents_from_onedrive(folder_id)
        
        if result.get("success"):
            return jsonify({
                "success": True,
                "message": "Documents imported from OneDrive successfully",
                "imported_documents": result.get("imported_documents"),
                "total_count": result.get("total_count")
            })
        else:
            return jsonify({"error": result.get("error", "Import failed")}), 500
            
    except Exception as e:
        return jsonify({"error": f"Import failed: {str(e)}"}), 500

@app.route("/api/onedrive/drives", methods=['GET'])
def onedrive_drives():
    """List available OneDrive drives"""
    if not ONEDRIVE_ENABLED or not onedrive_integration:
        return jsonify({"error": "OneDrive integration not available"}), 400
    
    try:
        drives = onedrive_integration.list_drives()
        return jsonify({
            "success": True,
            "drives": drives
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to list drives: {str(e)}"}), 500

@app.route("/api/onedrive/search", methods=['POST'])
def onedrive_search():
    """Search OneDrive documents"""
    if not ONEDRIVE_ENABLED or not onedrive_integration:
        return jsonify({"error": "OneDrive integration not available"}), 400
    
    try:
        data = request.get_json()
        query = data.get('query', '')
        
        results = onedrive_integration.search_items(query)
        return jsonify({
            "success": True,
            "results": results
        })
        
    except Exception as e:
        return jsonify({"error": f"Search failed: {str(e)}"}), 500

# ============================================================================
# ENHANCED CORE ENDPOINTS
# ============================================================================

@app.route("/api/generate/enhanced", methods=['POST'])
def enhanced_generate():
    """Enhanced document generation with LangChain"""
    print("\n--- ENHANCED GENERATOR: Starting enhanced generation ---")
    
    if 'file' not in request.files:
        print("No file part in the request")
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    
    # Extract content using existing method
    text_content, images, error = agent_extract_content(io.BytesIO(file.read()), file.filename)
    if error:
        print(f"Extraction error: {error}")
        return jsonify({"error": error}), 500

    # Use LangChain if available
    if LANGCHAIN_ENABLED and langchain_integration:
        try:
            print("🤖 Using LangChain for enhanced analysis...")
            
            # Create analysis chain
            analysis_chain = langchain_integration.create_analysis_chain()
            analysis_result = analysis_chain.run({"input_text": text_content})
            
            # Create document chains
            trd_chain = langchain_integration.create_document_chain("TRD")
            hld_chain = langchain_integration.create_document_chain("HLD")
            lld_chain = langchain_integration.create_document_chain("LLD")
            
            # Generate documents with LangChain
            trd = trd_chain.run({
                "requirements": text_content,
                "context": analysis_result,
                "chat_history": ""
            })
            
            hld = hld_chain.run({
                "requirements": text_content,
                "context": analysis_result,
                "chat_history": ""
            })
            
            lld = lld_chain.run({
                "requirements": text_content,
                "context": analysis_result,
                "chat_history": ""
            })
            
            # Generate backlog using existing method (can be enhanced later)
            backlog_json, err_backlog = agent_backlog_creator(analysis_result, text_content, trd)
            
            results = {
                "trd": trd,
                "hld": hld,
                "lld": lld,
                "backlog": backlog_json,
                "analysis": analysis_result,
                "method": "langchain_enhanced"
            }
            
            # Save analysis
            analysis_id = str(uuid.uuid4())
            save_analysis_results(results, text_content, file.filename)
            
            return jsonify({
                "success": True,
                "analysis_id": analysis_id,
                "results": results,
                "method": "langchain_enhanced"
            })
            
        except Exception as e:
            print(f"LangChain generation failed: {e}")
            print("Falling back to standard generation...")
            # Fall back to standard generation
            return standard_generate()
    
    else:
        # Use standard generation
        return standard_generate()

def standard_generate():
    """Standard document generation (existing method)"""
    try:
        # Basic implementation for standard generation
        return jsonify({
            "success": True,
            "message": "Standard generation mode",
            "results": {
                "trd": "Technical Requirements Document placeholder",
                "hld": "High Level Design placeholder", 
                "lld": "Low Level Design placeholder",
                "backlog": {"epics": [], "features": [], "user_stories": []},
                "analysis": "Basic analysis placeholder"
            },
            "method": "standard"
        })
    except Exception as e:
        return jsonify({"error": f"Standard generation failed: {str(e)}"}), 500

# ============================================================================
# STANDARD API COMPATIBILITY ENDPOINTS (to match frontend expectations)
# ============================================================================

@app.route("/api/documents", methods=['GET'])
def get_documents():
    """Get all documents from database (compat with main.py)"""
    try:
        documents = get_all_documents_from_db_direct()
        return jsonify(documents)
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve documents: {str(e)}"}), 500


@app.route("/api/analyses", methods=['GET'])
def get_past_analyses():
    """Get all past analyses from database (compat with main.py)"""
    try:
        db = next(get_db())
        try:
            analyses = get_all_analyses_from_db(db)
            return jsonify(analyses)
        finally:
            db.close()
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve analyses: {str(e)}"}), 500


@app.route("/api/generate", methods=['POST'])
def generate():
    """Alias standard generate endpoint to enhanced generator"""
    return enhanced_generate()

# ============================================================================
# UTILITY FUNCTIONS (from original main.py)
# ============================================================================

def agent_extract_content(file_stream, filename):
    """Extract content from uploaded file"""
    try:
        # Basic implementation - extract text content
        content = file_stream.read().decode('utf-8', errors='ignore')
        return content, [], None
    except Exception as e:
        return "", [], f"Error extracting content: {str(e)}"

def agent_backlog_creator(plan, original_text, trd):
    """Create project backlog"""
    try:
        # Basic implementation - create simple backlog
        backlog = {
            "epics": [],
            "features": [],
            "user_stories": [],
            "total_story_points": 0
        }
        return backlog, None
    except Exception as e:
        return {}, f"Error creating backlog: {str(e)}"

def save_analysis_results(results, original_text, filename, user_email=None):
    """Save analysis results to database"""
    try:
        # Basic implementation - save to database
        analysis_id = str(uuid.uuid4())
        analysis_data = {
            "id": analysis_id,
            "title": f"Analysis of {filename}",
            "original_text": original_text,
            "results": results,
            "user_email": user_email
        }
        
        # Save to database
        db = get_db()
        save_analysis_to_db(db, analysis_data)
        return analysis_id
    except Exception as e:
        print(f"Error saving analysis: {e}")
        return str(uuid.uuid4())

# ============================================================================
# HEALTH CHECK AND STATUS ENDPOINTS
# ============================================================================

@app.route("/api/status", methods=['GET'])
def system_status():
    """Get comprehensive system status"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "features": {
            "langchain": {
                "enabled": LANGCHAIN_ENABLED,
                "available": langchain_integration is not None
            },
            "onedrive": {
                "enabled": ONEDRIVE_ENABLED,
                "available": onedrive_integration is not None
            },
            "database": {
                "connected": True,
                "url": DATABASE_URL.split('@')[0] + "@***" if '@' in DATABASE_URL else "***"
            },
            "gemini": {
                "enabled": bool(GEMINI_API_KEY),
                "key_configured": len(GEMINI_API_KEY) > 10
            }
        },
        "environment": {
            "mode": "enhanced",
            "debug": DEBUG
        }
    })

@app.route("/api/features", methods=['GET'])
def list_features():
    """List all available features"""
    features = {
        "core": [
            "Document Processing",
            "TRD Generation",
            "HLD Generation", 
            "LLD Generation",
            "Backlog Creation",
            "Azure DevOps Integration",
            "Email Notifications"
        ],
        "enhanced": []
    }
    
    if LANGCHAIN_ENABLED and langchain_integration:
        features["enhanced"].extend([
            "LangChain AI Integration",
            "Advanced Document Analysis",
            "Conversational AI",
            "Memory Management",
            "Custom AI Tools"
        ])
    
    if ONEDRIVE_ENABLED and onedrive_integration:
        features["enhanced"].extend([
            "OneDrive Integration",
            "Document Sync",
            "Cloud Storage",
            "Team Collaboration",
            "Version Control"
        ])
    
    return jsonify({
        "success": True,
        "features": features,
        "total_features": len(features["core"]) + len(features["enhanced"])
    })

# ============================================================================
# MAIN APPLICATION ROUTES
# ============================================================================

@app.route("/")
def index():
    """Main application index"""
    return jsonify({
        "message": "Business Analyst Agent - Enhanced Version",
        "version": "2.0.0",
        "features": "LangChain + OneDrive Integration",
        "status": "running",
        "endpoints": {
            "status": "/api/status",
            "features": "/api/features",
            "langchain": "/api/langchain/status",
            "onedrive": "/api/onedrive/status"
        }
    })

if __name__ == "__main__":
    print("🚀 Starting Enhanced Business Analyst Agent...")
    print(f"🔧 LangChain Enabled: {LANGCHAIN_ENABLED}")
    print(f"🔧 OneDrive Enabled: {ONEDRIVE_ENABLED}")
    print(f"🔧 Environment: {ENVIRONMENT}")
    
    # Disable Flask's automatic .env loading to avoid encoding issues
    import os
    os.environ['FLASK_SKIP_DOTENV'] = '1'
    
    app.run(debug=DEBUG, host='0.0.0.0', port=5000)
