# database.py
# Database and Vector Database Configuration

import os
from sqlalchemy import create_engine, Column, String, DateTime, Text, Integer, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import json
from datetime import datetime
import uuid
from io import BytesIO
import psycopg2
from psycopg2.extras import RealDictCursor

# Database Configuration - PostgreSQL only
DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql+psycopg2://user:pass@host:5432/dbname')
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Vector Database Configuration - Make Qdrant optional
QDRANT_HOST = os.getenv('QDRANT_HOST', 'localhost')
QDRANT_PORT = int(os.getenv('QDRANT_PORT', 6333))
# Default to disabled to speed up startup and avoid heavy model downloads unless explicitly enabled
QDRANT_ENABLED = os.getenv('QDRANT_ENABLED', 'false').lower() == 'true'

# Initialize Qdrant client only if enabled
qdrant_client = None
embedding_model = None
VECTOR_SIZE = 384  # Dimension of the embedding model

if QDRANT_ENABLED:
    try:
        from qdrant_client import QdrantClient
        from qdrant_client.models import Distance, VectorParams, PointStruct
        from sentence_transformers import SentenceTransformer
        
        qdrant_client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
        os.environ['HF_HUB_DISABLE_SYMLINKS_WARNING'] = '1'
        print("✅ Qdrant vector database enabled and connected successfully.")
    except Exception as e:
        print(f"⚠️ Warning: Qdrant initialization failed: {e}")
        print("Vector database features will be disabled. Set QDRANT_ENABLED=false to suppress this warning.")
        qdrant_client = None
        embedding_model = None
else:
    print("ℹ️ Qdrant vector database disabled by configuration.")

# Database Models
class Document(Base):
    __tablename__ = "documents"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    file_type = Column(String, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String, nullable=False)
    content = Column(Text)
    meta = Column(JSON)  # Renamed from metadata
    status = Column(String, default="uploaded")

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    date = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="completed")
    original_text = Column(Text)
    results = Column(JSON)
    document_id = Column(String)
    user_email = Column(String)

class Approval(Base):
    __tablename__ = "approvals"
    
    id = Column(String, primary_key=True)
    analysis_id = Column(String, nullable=False)
    status = Column(String, default="pending")  # pending, approved, rejected
    created_date = Column(DateTime, default=datetime.utcnow)  # Changed from created_at
    updated_date = Column(DateTime, default=datetime.utcnow)  # Changed from updated_at
    approver_email = Column(String)
    results_summary = Column(JSON)
    approver_response = Column(String)
    ado_result = Column(JSON)

class VectorEmbedding(Base):
    __tablename__ = "vector_embeddings"
    
    id = Column(String, primary_key=True)
    content = Column(Text, nullable=False)
    embedding = Column(Text, nullable=False)  # JSON string of embedding
    meta = Column(JSON)  # Renamed from metadata
    source_type = Column(String)  # 'document', 'analysis', 'requirement'
    source_id = Column(String)

# Database Operations
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initialize database tables only when explicitly requested.

    Controlled by environment variable INIT_DB_ON_START (default: false).
    """
    try:
        init_on_start = os.getenv('INIT_DB_ON_START', 'false').lower() == 'true'
        if not init_on_start:
            print("ℹ️ Skipping automatic DB table creation (INIT_DB_ON_START=false)")
            return

        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        if qdrant_client:
            init_qdrant_collections()
    except Exception as e:
        print(f"❌ Error initializing database: {e}")
        raise e

def save_approval_to_db(db, approval_data):
    """Save approval to database"""
    try:
        approval = Approval(
            id=approval_data['id'],
            analysis_id=approval_data['analysis_id'],
            status=approval_data['status'],
            created_date=datetime.fromisoformat(approval_data['created_date']),  # Changed from created_at
            updated_date=datetime.fromisoformat(approval_data['updated_date']),  # Changed from updated_at
            approver_email=approval_data['approver_email'],
            results_summary=approval_data['results_summary'],
            approver_response=approval_data.get('approver_response'),
            ado_result=approval_data.get('ado_result')
        )
        db.add(approval)
        db.commit()
        print(f"✅ Approval saved to database: {approval_data['id']}")
        return approval
    except Exception as e:
        print(f"❌ Error saving approval to database: {e}")
        db.rollback()
        raise e

def get_approval_from_db(db, approval_id):
    """Get approval from database"""
    try:
        approval = db.query(Approval).filter(Approval.id == approval_id).first()
        if approval:
            return {
                'id': approval.id,
                'analysis_id': approval.analysis_id,
                'status': approval.status,
                'created_at': approval.created_date.isoformat(),
                'updated_at': approval.updated_date.isoformat(),
                'approver_email': approval.approver_email,
                'results_summary': approval.results_summary,
                'approver_response': approval.approver_response,
                'ado_result': approval.ado_result
            }
        return None
    except Exception as e:
        print(f"❌ Error getting approval from database: {e}")
        return None

def update_approval_in_db(db, approval_id, update_data):
    """Update approval in database"""
    try:
        approval = db.query(Approval).filter(Approval.id == approval_id).first()
        if approval:
            for key, value in update_data.items():
                if hasattr(approval, key):
                    setattr(approval, key, value)
            approval.updated_date = datetime.utcnow()
            db.commit()
            print(f"✅ Approval updated in database: {approval_id}")
            return True
        return False
    except Exception as e:
        print(f"❌ Error updating approval in database: {e}")
        db.rollback()
        return False

# Qdrant Vector Database Operations
def init_qdrant_collections():
    """Initialize Qdrant collections"""
    if not qdrant_client:
        print("Qdrant not available, skipping collection initialization.")
        return
        
    collections = ["documents", "analyses", "requirements"]
    
    for collection_name in collections:
        try:
            # Check if collection exists
            try:
                qdrant_client.get_collection(collection_name)
                print(f"Collection '{collection_name}' already exists, skipping creation.")
            except Exception:
                # Collection doesn't exist, create it
                qdrant_client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
                )
                print(f"Collection '{collection_name}' created successfully.")
        except Exception as e:
            print(f"Error initializing collection '{collection_name}': {e}")
            # Continue with other collections even if one fails
            continue

def get_or_create_collection(collection_name):
    """Get or create a Qdrant collection"""
    if not qdrant_client:
        print("Qdrant not available, skipping collection creation.")
        return collection_name
        
    try:
        # Check if collection exists
        qdrant_client.get_collection(collection_name)
    except:
        # Create collection if it doesn't exist
        qdrant_client.create_collection(
            collection_name=collection_name,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE)
        )
    return collection_name

def add_to_vector_db(content, meta, collection_name="documents"):
    """Add content to Qdrant vector database"""
    if not qdrant_client or not embedding_model:
        print("Vector database not available, skipping vector storage.")
        return
        
    # Ensure collection exists
    get_or_create_collection(collection_name)
    
    # Generate embedding
    embedding = embedding_model.encode(content).tolist()
    
    # Create point ID from meta or generate new one
    point_id = meta.get('id', str(uuid.uuid4()))
    
    # Add to collection
    qdrant_client.upsert(
        collection_name=collection_name,
        points=[
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "content": content,
                    "meta": meta
                }
            )
        ]
    )

def search_vector_db(query, collection_name="documents", n_results=5):
    """Search Qdrant vector database"""
    if not qdrant_client or not embedding_model:
        print("Vector database not available, returning empty search results.")
        return {
            "documents": [],
            "metas": [],
            "distances": [],
            "ids": []
        }
        
    # Ensure collection exists
    get_or_create_collection(collection_name)
    
    # Generate query embedding
    query_embedding = embedding_model.encode(query).tolist()
    
    # Search
    search_result = qdrant_client.search(
        collection_name=collection_name,
        query_vector=query_embedding,
        limit=n_results
    )
    
    # Format results to match expected structure
    results = {
        "documents": [],
        "metas": [],
        "distances": [],
        "ids": []
    }
    
    for point in search_result:
        results["documents"].append(point.payload.get("content", ""))
        results["metas"].append(point.payload.get("meta", {}))
        results["distances"].append(point.score)
        results["ids"].append(point.id)
    
    return results

def delete_from_vector_db(point_id, collection_name="documents"):
    """Delete a point from Qdrant vector database"""
    if not qdrant_client:
        print("Vector database not available, skipping deletion.")
        return False
        
    try:
        qdrant_client.delete(
            collection_name=collection_name,
            points_selector=[point_id]
        )
        return True
    except Exception as e:
        print(f"Error deleting from vector db: {e}")
        return False

def update_vector_db(point_id, content, meta, collection_name="documents"):
    """Update a point in Qdrant vector database"""
    if not qdrant_client or not embedding_model:
        print("Vector database not available, skipping update.")
        return
        
    # Generate new embedding
    embedding = embedding_model.encode(content).tolist()
    
    # Update point
    qdrant_client.upsert(
        collection_name=collection_name,
        points=[
            PointStruct(
                id=point_id,
                vector=embedding,
                payload={
                    "content": content,
                    "meta": meta
                }
            )
        ]
    )

# Utility Functions
def save_document_to_db(db, document_data, file_path, content):
    """Save document to database using SQLAlchemy"""
    try:
        print(f"DEBUG: Creating Document object with ID: {document_data['id']}")
        document = Document(
            id=document_data['id'],
            name=document_data['name'],
            file_type=document_data['fileType'],
            file_path=file_path,
            content=content,
            meta=document_data  # Renamed from metadata
        )
        print(f"DEBUG: Document object created, adding to session...")
        db.add(document)
        print(f"DEBUG: Document added to session, committing...")
        db.commit()
        print(f"DEBUG: Document committed successfully to database")
        return document
    except Exception as e:
        print(f"DEBUG: Error in save_document_to_db: {e}")
        db.rollback()
        raise e

def _get_psycopg_conn():
    """Create a psycopg2 connection from DATABASE_URL, normalizing the scheme for psycopg2."""
    pg_conn_str = DATABASE_URL.replace('postgresql+psycopg2://', 'postgresql://')
    return psycopg2.connect(pg_conn_str)

def save_document_to_db_direct(document_data, file_path, content):
    """Save document to database using direct psycopg2 connection.

    Expects document_data dict with keys: id, name, file_type or fileType, upload_date
    """
    try:
        conn = _get_psycopg_conn()
        cursor = conn.cursor()

        name = document_data.get('name')
        file_type = document_data.get('file_type') or document_data.get('fileType')
        upload_date = document_data.get('upload_date') or datetime.utcnow().isoformat()

        cursor.execute(
            "INSERT INTO documents (id, name, file_type, file_path, content, upload_date) VALUES (%s, %s, %s, %s, %s, %s)",
            (document_data.get('id'), name, file_type, file_path, content, datetime.utcnow())
        )
        conn.commit()
        cursor.close()
        conn.close()

        print(f"✅ [Direct DB] Document saved successfully: {name}")
        return True

    except Exception as e:
        print(f"❌ [Direct DB] Error saving document: {e}")
        import traceback
        traceback.print_exc()
        raise e

def save_analysis_to_db(db, analysis_data):
    """Save analysis to database"""
    # Ensure results are JSON serializable
    if isinstance(analysis_data['results'], BytesIO):
        analysis_data['results'] = analysis_data['results'].getvalue().decode('utf-8')

    analysis = Analysis(
        id=analysis_data['id'],
        title=analysis_data['title'],
        original_text=analysis_data['originalText'],
        results=analysis_data['results'],
        document_id=analysis_data.get('document_id'),
        user_email=analysis_data.get('user_email')
    )
    db.add(analysis)
    db.commit()
    return analysis

def get_all_documents_from_db(db):
    """Get all documents from database using SQLAlchemy"""
    try:
        documents = db.query(Document).order_by(Document.upload_date.desc()).all()
        return [
            {
                'id': doc.id,
                'name': doc.name,
                'file_type': doc.file_type,
                'upload_date': doc.upload_date.isoformat(),
                'file_path': doc.file_path,
                'content': doc.content,
                'meta': doc.meta,
                'status': doc.status
            }
            for doc in documents
        ]
    except Exception as e:
        print(f"❌ Error retrieving documents from database: {e}")
        return []

def get_all_documents_from_db_direct():
    """Get all documents using direct psycopg2 connection with RealDictCursor"""
    try:
        print(f"DEBUG: Getting all documents using direct psycopg2")
        conn = _get_psycopg_conn()
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        cursor.execute("SELECT * FROM documents ORDER BY upload_date DESC")
        documents = cursor.fetchall()

        result = []
        for doc in documents:
            doc_dict = dict(doc)
            if doc_dict.get('upload_date'):
                doc_dict['upload_date'] = doc_dict['upload_date'].isoformat()
            result.append(doc_dict)

        cursor.close()
        conn.close()

        print(f"✅ [Direct DB] Retrieved {len(result)} documents")
        return result

    except Exception as e:
        print(f"❌ [Direct DB] Error getting documents: {e}")
        import traceback
        traceback.print_exc()
        return []

def get_all_analyses_from_db(db):
    """Get all analyses from database"""
    try:
        analyses = db.query(Analysis).order_by(Analysis.date.desc()).all()
        return [
            {
                'id': analysis.id,
                'title': analysis.title,
                'date': analysis.date.isoformat(),
                'status': analysis.status,
                'original_text': analysis.original_text,
                'results': analysis.results,
                'document_id': analysis.document_id,
                'user_email': analysis.user_email
            }
            for analysis in analyses
        ]
    except Exception as e:
        print(f"❌ Error retrieving analyses from database: {e}")
        return []

def check_document_exists_by_name(db, filename):
    """Check if a document with the given name already exists using SQLAlchemy"""
    try:
        existing_doc = db.query(Document).filter(Document.name == filename).first()
        return existing_doc is not None
    except Exception as e:
        print(f"❌ Error checking document existence: {e}")
        return False

def check_document_exists_by_name_direct(filename):
    """Check if document exists using direct psycopg2 connection"""
    try:
        print(f"DEBUG: Checking if document exists: {filename}")
        conn = _get_psycopg_conn()
        cursor = conn.cursor()

        cursor.execute("SELECT COUNT(*) FROM documents WHERE name = %s", (filename,))
        count = cursor.fetchone()[0]

        cursor.close()
        conn.close()

        exists = count > 0
        print(f"DEBUG: Document {filename} exists: {exists}")
        return exists

    except Exception as e:
        print(f"❌ [Direct DB] Error checking document existence: {e}")
        import traceback
        traceback.print_exc()
        return False

def get_document_by_id(db, doc_id):
    """Get a specific document by ID"""
    try:
        doc = db.query(Document).filter(Document.id == doc_id).first()
        if doc:
            return {
                'id': doc.id,
                'name': doc.name,
                'file_type': doc.file_type,
                'upload_date': doc.upload_date.isoformat(),
                'file_path': doc.file_path,
                'content': doc.content,
                'meta': doc.meta,
                'status': doc.status
            }
        return None
    except Exception as e:
        print(f"❌ Error retrieving document by ID: {e}")
        return None

def get_analysis_by_id_from_db(db, analysis_id):
    """Get a specific analysis by ID from database"""
    try:
        analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
        if analysis:
            return {
                'id': analysis.id,
                'title': analysis.title,
                'date': analysis.date.isoformat(),
                'status': analysis.status,
                'original_text': analysis.original_text,
                'results': analysis.results,
                'document_id': analysis.document_id,
                'user_email': analysis.user_email
            }
        return None
    except Exception as e:
        print(f"❌ Error retrieving analysis by ID: {e}")
        return None