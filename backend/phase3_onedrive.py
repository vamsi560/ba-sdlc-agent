# phase3_onedrive.py
# Microsoft OneDrive Integration for Enhanced Document Management

import os
import json
import requests
import base64
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import asyncio
from urllib.parse import urlencode, quote

# Microsoft Graph API
from msal import ConfidentialClientApplication
from azure.identity import ClientSecretCredential

# Custom imports
from database import get_db, Document, Analysis
from config import (
    ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, ONEDRIVE_TENANT_ID,
    ONEDRIVE_REDIRECT_URI, ONEDRIVE_SCOPE
)

class OneDriveIntegration:
    """Microsoft OneDrive integration for document management"""
    
    def __init__(self):
        self.client_id = ONEDRIVE_CLIENT_ID
        self.client_secret = ONEDRIVE_CLIENT_SECRET
        self.tenant_id = ONEDRIVE_TENANT_ID
        self.redirect_uri = ONEDRIVE_REDIRECT_URI
        self.scope = ONEDRIVE_SCOPE or ["https://graph.microsoft.com/.default"]
        
        self.app = None
        self.access_token = None
        self.refresh_token = None
        self.token_expires_at = None
        
        self.setup_application()
    
    def setup_application(self):
        """Initialize Microsoft Graph application"""
        try:
            # Check if required credentials are available
            if not self.client_id or not self.client_secret or not self.tenant_id:
                print("ℹ️ OneDrive integration disabled - missing credentials")
                self.app = None
                return
            
            self.app = ConfidentialClientApplication(
                client_id=self.client_id,
                client_credential=self.client_secret,
                authority=f"https://login.microsoftonline.com/{self.tenant_id}"
            )
            print("✅ OneDrive application initialized successfully")
        except Exception as e:
            print(f"⚠️ OneDrive setup warning: {e}")
            self.app = None
    
    def get_auth_url(self) -> str:
        """Generate authorization URL for OneDrive access"""
        auth_url = self.app.get_authorization_request_url(
            scopes=self.scope,
            redirect_uri=self.redirect_uri,
            state="onedrive_auth"
        )
        return auth_url
    
    def acquire_token_by_authorization_code(self, auth_code: str) -> Dict[str, Any]:
        """Acquire access token using authorization code"""
        try:
            result = self.app.acquire_token_by_authorization_code(
                code=auth_code,
                scopes=self.scope,
                redirect_uri=self.redirect_uri
            )
            
            if "access_token" in result:
                self.access_token = result["access_token"]
                self.refresh_token = result.get("refresh_token")
                self.token_expires_at = datetime.now() + timedelta(seconds=result.get("expires_in", 3600))
                
                return {
                    "success": True,
                    "access_token": self.access_token,
                    "expires_at": self.token_expires_at.isoformat()
                }
            else:
                return {
                    "success": False,
                    "error": result.get("error_description", "Token acquisition failed")
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def refresh_access_token(self) -> bool:
        """Refresh access token using refresh token"""
        if not self.refresh_token:
            return False
        
        try:
            result = self.app.acquire_token_by_refresh_token(
                refresh_token=self.refresh_token,
                scopes=self.scope
            )
            
            if "access_token" in result:
                self.access_token = result["access_token"]
                self.token_expires_at = datetime.now() + timedelta(seconds=result.get("expires_in", 3600))
                return True
            else:
                return False
                
        except Exception as e:
            print(f"Token refresh failed: {e}")
            return False
    
    def ensure_valid_token(self) -> bool:
        """Ensure we have a valid access token"""
        if not self.access_token:
            return False
        
        if self.token_expires_at and datetime.now() >= self.token_expires_at:
            return self.refresh_access_token()
        
        return True
    
    def make_graph_request(self, endpoint: str, method: str = "GET", data: Dict = None) -> Dict[str, Any]:
        """Make request to Microsoft Graph API"""
        if not self.ensure_valid_token():
            return {"error": "No valid access token"}
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        url = f"https://graph.microsoft.com/v1.0{endpoint}"
        
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                return {"error": f"Unsupported method: {method}"}
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 401:
                # Token expired, try to refresh
                if self.refresh_access_token():
                    return self.make_graph_request(endpoint, method, data)
                else:
                    return {"error": "Authentication failed"}
            else:
                return {"error": f"Request failed: {response.status_code}", "details": response.text}
                
        except Exception as e:
            return {"error": f"Request exception: {str(e)}"}
    
    def list_drives(self) -> Dict[str, Any]:
        """List available OneDrive drives"""
        return self.make_graph_request("/me/drives")
    
    def list_root_items(self, drive_id: str = None) -> Dict[str, Any]:
        """List items in OneDrive root folder"""
        if drive_id:
            endpoint = f"/drives/{drive_id}/root/children"
        else:
            endpoint = "/me/drive/root/children"
        
        return self.make_graph_request(endpoint)
    
    def list_folder_items(self, folder_id: str, drive_id: str = None) -> Dict[str, Any]:
        """List items in a specific OneDrive folder"""
        if drive_id:
            endpoint = f"/drives/{drive_id}/items/{folder_id}/children"
        else:
            endpoint = f"/me/drive/items/{folder_id}/children"
        
        return self.make_graph_request(endpoint)
    
    def search_items(self, query: str, drive_id: str = None) -> Dict[str, Any]:
        """Search for items in OneDrive"""
        if drive_id:
            endpoint = f"/drives/{drive_id}/root/search(q='{quote(query)}')"
        else:
            endpoint = f"/me/drive/root/search(q='{quote(query)}')"
        
        return self.make_graph_request(endpoint)
    
    def get_file_content(self, file_id: str, drive_id: str = None) -> Dict[str, Any]:
        """Get file content from OneDrive"""
        if drive_id:
            endpoint = f"/drives/{drive_id}/items/{file_id}/content"
        else:
            endpoint = f"/me/drive/items/{file_id}/content"
        
        if not self.ensure_valid_token():
            return {"error": "No valid access token"}
        
        headers = {
            "Authorization": f"Bearer {self.access_token}"
        }
        
        url = f"https://graph.microsoft.com/v1.0{endpoint}"
        
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                return {
                    "success": True,
                    "content": response.content,
                    "content_type": response.headers.get("content-type")
                }
            else:
                return {"error": f"Failed to get file content: {response.status_code}"}
        except Exception as e:
            return {"error": f"Exception getting file content: {str(e)}"}
    
    def upload_file(self, file_path: str, parent_folder_id: str = None, drive_id: str = None) -> Dict[str, Any]:
        """Upload file to OneDrive"""
        if not os.path.exists(file_path):
            return {"error": "File not found"}
        
        file_name = os.path.basename(file_path)
        
        if parent_folder_id:
            if drive_id:
                endpoint = f"/drives/{drive_id}/items/{parent_folder_id}:/{file_name}:/content"
            else:
                endpoint = f"/me/drive/items/{parent_folder_id}:/{file_name}:/content"
        else:
            if drive_id:
                endpoint = f"/drives/{drive_id}/root:/{file_name}:/content"
            else:
                endpoint = f"/me/drive/root:/{file_name}:/content"
        
        if not self.ensure_valid_token():
            return {"error": "No valid access token"}
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/octet-stream"
        }
        
        url = f"https://graph.microsoft.com/v1.0{endpoint}"
        
        try:
            with open(file_path, 'rb') as file:
                response = requests.put(url, headers=headers, data=file)
            
            if response.status_code in [200, 201]:
                return {
                    "success": True,
                    "file_info": response.json()
                }
            else:
                return {"error": f"Upload failed: {response.status_code}", "details": response.text}
                
        except Exception as e:
            return {"error": f"Upload exception: {str(e)}"}
    
    def create_folder(self, folder_name: str, parent_folder_id: str = None, drive_id: str = None) -> Dict[str, Any]:
        """Create a new folder in OneDrive"""
        if parent_folder_id:
            if drive_id:
                endpoint = f"/drives/{drive_id}/items/{parent_folder_id}/children"
            else:
                endpoint = f"/me/drive/items/{parent_folder_id}/children"
        else:
            if drive_id:
                endpoint = f"/drives/{drive_id}/root/children"
            else:
                endpoint = "/me/drive/root/children"
        
        data = {
            "name": folder_name,
            "folder": {},
            "@microsoft.graph.conflictBehavior": "rename"
        }
        
        return self.make_graph_request(endpoint, "POST", data)
    
    def delete_item(self, item_id: str, drive_id: str = None) -> Dict[str, Any]:
        """Delete an item from OneDrive"""
        if drive_id:
            endpoint = f"/drives/{drive_id}/items/{item_id}"
        else:
            endpoint = f"/me/drive/items/{item_id}"
        
        return self.make_graph_request(endpoint, "DELETE")
    
    def get_item_metadata(self, item_id: str, drive_id: str = None) -> Dict[str, Any]:
        """Get metadata for a OneDrive item"""
        if drive_id:
            endpoint = f"/drives/{drive_id}/items/{item_id}"
        else:
            endpoint = f"/me/drive/items/{item_id}"
        
        return self.make_graph_request(endpoint)
    
    def sync_documents_to_onedrive(self, analysis_id: str, folder_name: str = None) -> Dict[str, Any]:
        """Sync generated documents to OneDrive"""
        db = get_db()
        try:
            analysis = db.query(Analysis).filter(Analysis.id == analysis_id).first()
            if not analysis:
                return {"error": "Analysis not found"}
            
            results = analysis.results
            
            # Create folder for this analysis
            if not folder_name:
                folder_name = f"BA_Analysis_{analysis_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            folder_result = self.create_folder(folder_name)
            if "error" in folder_result:
                return folder_result
            
            folder_id = folder_result.get("id")
            uploaded_files = []
            
            # Upload TRD
            if 'trd' in results:
                trd_file_path = f"temp_trd_{analysis_id}.md"
                with open(trd_file_path, 'w', encoding='utf-8') as f:
                    f.write(results['trd'])
                
                upload_result = self.upload_file(trd_file_path, folder_id)
                if upload_result.get("success"):
                    uploaded_files.append("TRD.md")
                
                os.remove(trd_file_path)
            
            # Upload HLD
            if 'hld' in results:
                hld_file_path = f"temp_hld_{analysis_id}.md"
                with open(hld_file_path, 'w', encoding='utf-8') as f:
                    f.write(results['hld'])
                
                upload_result = self.upload_file(hld_file_path, folder_id)
                if upload_result.get("success"):
                    uploaded_files.append("HLD.md")
                
                os.remove(hld_file_path)
            
            # Upload LLD
            if 'lld' in results:
                lld_file_path = f"temp_lld_{analysis_id}.md"
                with open(lld_file_path, 'w', encoding='utf-8') as f:
                    f.write(results['lld'])
                
                upload_result = self.upload_file(lld_file_path, folder_id)
                if upload_result.get("success"):
                    uploaded_files.append("LLD.md")
                
                os.remove(lld_file_path)
            
            # Upload backlog
            if 'backlog' in results:
                backlog_file_path = f"temp_backlog_{analysis_id}.json"
                with open(backlog_file_path, 'w', encoding='utf-8') as f:
                    f.write(results['backlog'])
                
                upload_result = self.upload_file(backlog_file_path, folder_id)
                if upload_result.get("success"):
                    uploaded_files.append("backlog.json")
                
                os.remove(backlog_file_path)
            
            return {
                "success": True,
                "folder_id": folder_id,
                "folder_name": folder_name,
                "uploaded_files": uploaded_files,
                "onedrive_url": f"https://onedrive.live.com/edit.aspx?cid={folder_id}"
            }
            
        except Exception as e:
            return {"error": f"Sync failed: {str(e)}"}
        finally:
            db.close()
    
    def import_documents_from_onedrive(self, folder_id: str = None, drive_id: str = None) -> Dict[str, Any]:
        """Import documents from OneDrive for analysis"""
        try:
            if folder_id:
                items_result = self.list_folder_items(folder_id, drive_id)
            else:
                items_result = self.list_root_items(drive_id)
            
            if "error" in items_result:
                return items_result
            
            imported_documents = []
            
            for item in items_result.get("value", []):
                if item.get("file"):
                    # Download file content
                    file_content = self.get_file_content(item["id"], drive_id)
                    if file_content.get("success"):
                        imported_documents.append({
                            "name": item["name"],
                            "id": item["id"],
                            "content": file_content["content"],
                            "content_type": file_content["content_type"],
                            "size": item.get("size", 0),
                            "last_modified": item.get("lastModifiedDateTime")
                        })
            
            return {
                "success": True,
                "imported_documents": imported_documents,
                "total_count": len(imported_documents)
            }
            
        except Exception as e:
            return {"error": f"Import failed: {str(e)}"}
    
    def get_onedrive_usage(self) -> Dict[str, Any]:
        """Get OneDrive storage usage information"""
        return self.make_graph_request("/me/drive/quota")
    
    def get_recent_files(self, limit: int = 20) -> Dict[str, Any]:
        """Get recently modified files"""
        endpoint = f"/me/drive/recent?$top={limit}"
        return self.make_graph_request(endpoint)
    
    def share_file(self, file_id: str, email: str, permission: str = "read") -> Dict[str, Any]:
        """Share a file with specific user"""
        data = {
            "recipients": [{"email": email}],
            "message": "Shared from BA Agent",
            "requireSignIn": True,
            "sendInvitation": True,
            "roles": [permission]
        }
        
        endpoint = f"/me/drive/items/{file_id}/invite"
        return self.make_graph_request(endpoint, "POST", data)

# Global instance
onedrive_integration = OneDriveIntegration()
