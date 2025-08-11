#!/usr/bin/env python3
"""
Script to clean up test data from the database
"""

import sys
import os
sys.path.append('backend')

from database import init_db, get_db, Document, Analysis, Approval

def cleanup_test_documents():
    """Remove test documents from database"""
    print("🧹 Cleaning up test documents...")
    print("=" * 50)
    
    try:
        db = next(get_db())
        try:
            # Find test documents (documents with 'test' in the name)
            test_docs = db.query(Document).filter(
                Document.name.like('%test%')
            ).all()
            
            print(f"📋 Found {len(test_docs)} test documents:")
            for doc in test_docs:
                print(f"   - {doc.name} (ID: {doc.id})")
            
            if test_docs:
                # Delete test documents
                for doc in test_docs:
                    db.delete(doc)
                    print(f"🗑️ Deleted: {doc.name}")
                
                db.commit()
                print(f"✅ Successfully deleted {len(test_docs)} test documents")
            else:
                print("ℹ️ No test documents found")
                
            return True
            
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Cleanup failed: {e}")
        return False

def show_current_documents():
    """Show current documents in database"""
    print("\n📋 Current Documents in Database:")
    print("=" * 50)
    
    try:
        db = next(get_db())
        try:
            documents = db.query(Document).all()
            
            if documents:
                print(f"📊 Total documents: {len(documents)}")
                for doc in documents:
                    print(f"   - {doc.name} (ID: {doc.id})")
                    print(f"     Type: {doc.file_type}, Status: {doc.status}")
                    print(f"     Uploaded: {doc.upload_date}")
                    print()
            else:
                print("ℹ️ No documents found in database")
                
        finally:
            db.close()
            
    except Exception as e:
        print(f"❌ Failed to retrieve documents: {e}")

def main():
    """Main cleanup function"""
    print("🧹 Database Cleanup Tool")
    print("=" * 60)
    
    # Show current state
    show_current_documents()
    
    # Ask for confirmation
    print("\n❓ Do you want to remove test documents? (y/n): ", end="")
    try:
        response = input().lower().strip()
        if response in ['y', 'yes']:
            if cleanup_test_documents():
                print("\n✅ Cleanup completed!")
                show_current_documents()
            else:
                print("\n❌ Cleanup failed!")
        else:
            print("\nℹ️ Cleanup cancelled")
    except KeyboardInterrupt:
        print("\n\nℹ️ Cleanup cancelled by user")
    
    return True

if __name__ == "__main__":
    main() 