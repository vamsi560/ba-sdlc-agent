#!/usr/bin/env python3
"""
Enhanced Image Processing for LLM Integration
Multiple approaches for handling different image formats
"""

import base64
import io
import os
from typing import List, Dict, Optional, Tuple

class EnhancedImageProcessor:
    """Comprehensive image processing for LLM integration"""
    
    def __init__(self):
        self.supported_formats = {
            'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif',
            'image/gif', 'image/bmp', 'image/tiff'
        }
        
    def process_images_for_llm(self, images: List[Dict]) -> List[Dict]:
        """Process images for LLM consumption with multiple fallback methods"""
        processed_images = []
        
        for img in images:
            mime_type = img.get('mime_type', '')
            image_data = base64.b64decode(img.get('data', ''))
            
            # Method 1: Try direct conversion with PIL
            processed_img = self._convert_with_pil(image_data, mime_type)
            if processed_img:
                processed_images.append(processed_img)
                continue
                
            # Method 2: Try with ImageMagick (Wand)
            processed_img = self._convert_with_wand(image_data, mime_type)
            if processed_img:
                processed_images.append(processed_img)
                continue
                
            # Method 3: Try with OpenCV
            processed_img = self._convert_with_opencv(image_data, mime_type)
            if processed_img:
                processed_images.append(processed_img)
                continue
                
            # Method 4: Try with pdf2image (for PDF images)
            processed_img = self._convert_with_pdf2image(image_data, mime_type)
            if processed_img:
                processed_images.append(processed_img)
                continue
                
            # Method 5: Create placeholder
            processed_img = self._create_placeholder(mime_type)
            if processed_img:
                processed_images.append(processed_img)
                
        return processed_images
    
    def _convert_with_pil(self, image_data: bytes, mime_type: str) -> Optional[Dict]:
        """Convert image using PIL/Pillow"""
        try:
            from PIL import Image
            import io
            
            image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode in ('RGBA', 'LA', 'P'):
                image = image.convert('RGB')
            
            # Convert to PNG
            output_buffer = io.BytesIO()
            image.save(output_buffer, format='PNG')
            converted_data = output_buffer.getvalue()
            
            return {
                'mime_type': 'image/png',
                'data': base64.b64encode(converted_data).decode('utf-8')
            }
            
        except Exception as e:
            print(f"DEBUG: PIL conversion failed for {mime_type}: {e}")
            return None
    
    def _convert_with_wand(self, image_data: bytes, mime_type: str) -> Optional[Dict]:
        """Convert image using ImageMagick (Wand)"""
        try:
            from wand.image import Image as WandImage
            
            with WandImage(blob=image_data) as wand_img:
                wand_img.format = 'png'
                converted_data = wand_img.make_blob()
                
                return {
                    'mime_type': 'image/png',
                    'data': base64.b64encode(converted_data).decode('utf-8')
                }
                
        except ImportError:
            print("DEBUG: ImageMagick (wand) not available")
            return None
        except Exception as e:
            print(f"DEBUG: ImageMagick conversion failed for {mime_type}: {e}")
            return None
    
    def _convert_with_opencv(self, image_data: bytes, mime_type: str) -> Optional[Dict]:
        """Convert image using OpenCV"""
        try:
            import cv2
            import numpy as np
            
            # Convert bytes to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                return None
            
            # Convert BGR to RGB
            img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Convert to PNG
            success, buffer = cv2.imencode('.png', img_rgb)
            if success:
                converted_data = buffer.tobytes()
                return {
                    'mime_type': 'image/png',
                    'data': base64.b64encode(converted_data).decode('utf-8')
                }
            
        except ImportError:
            print("DEBUG: OpenCV not available")
            return None
        except Exception as e:
            print(f"DEBUG: OpenCV conversion failed for {mime_type}: {e}")
            return None
    
    def _convert_with_pdf2image(self, image_data: bytes, mime_type: str) -> Optional[Dict]:
        """Convert PDF pages to images"""
        try:
            from pdf2image import convert_from_bytes
            
            # Convert PDF pages to images
            images = convert_from_bytes(image_data)
            if images:
                # Take first page
                img = images[0]
                output_buffer = io.BytesIO()
                img.save(output_buffer, format='PNG')
                converted_data = output_buffer.getvalue()
                
                return {
                    'mime_type': 'image/png',
                    'data': base64.b64encode(converted_data).decode('utf-8')
                }
                
        except ImportError:
            print("DEBUG: pdf2image not available")
            return None
        except Exception as e:
            print(f"DEBUG: pdf2image conversion failed for {mime_type}: {e}")
            return None
    
    def _create_placeholder(self, mime_type: str) -> Optional[Dict]:
        """Create a placeholder image when conversion fails"""
        try:
            from PIL import Image, ImageDraw
            
            # Create placeholder
            placeholder = Image.new('RGB', (400, 300), color='lightgray')
            draw = ImageDraw.Draw(placeholder)
            
            # Add text
            draw.text((20, 20), f"Image: {mime_type}", fill='black')
            draw.text((20, 50), "Format not supported", fill='red')
            draw.text((20, 80), "Converted to placeholder", fill='blue')
            
            # Convert to PNG
            output_buffer = io.BytesIO()
            placeholder.save(output_buffer, format='PNG')
            converted_data = output_buffer.getvalue()
            
            return {
                'mime_type': 'image/png',
                'data': base64.b64encode(converted_data).decode('utf-8')
            }
            
        except Exception as e:
            print(f"DEBUG: Failed to create placeholder: {e}")
            return None

class DirectImageSender:
    """Direct image sending to LLM without conversion"""
    
    def __init__(self):
        self.llm_supported_formats = {
            'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
        }
    
    def send_images_directly(self, images: List[Dict], llm_api_url: str, api_key: str) -> bool:
        """Send images directly to LLM if supported"""
        supported_images = []
        
        for img in images:
            mime_type = img.get('mime_type', '')
            if mime_type in self.llm_supported_formats:
                supported_images.append(img)
            else:
                print(f"DEBUG: Skipping unsupported format: {mime_type}")
        
        if supported_images:
            print(f"DEBUG: Sending {len(supported_images)} supported images to LLM")
            return True
        else:
            print("DEBUG: No supported images found for direct sending")
            return False

# Usage example
def setup_image_processing():
    """Setup image processing with multiple libraries"""
    print("🔧 Setting up enhanced image processing...")
    
    # Check available libraries
    libraries = {
        'PIL/Pillow': False,
        'ImageMagick (Wand)': False,
        'OpenCV': False,
        'pdf2image': False
    }
    
    try:
        from PIL import Image
        libraries['PIL/Pillow'] = True
        print("✅ PIL/Pillow available")
    except ImportError:
        print("❌ PIL/Pillow not available")
    
    try:
        from wand.image import Image as WandImage
        libraries['ImageMagick (Wand)'] = True
        print("✅ ImageMagick (Wand) available")
    except ImportError:
        print("❌ ImageMagick (Wand) not available")
    
    try:
        import cv2
        libraries['OpenCV'] = True
        print("✅ OpenCV available")
    except ImportError:
        print("❌ OpenCV not available")
    
    try:
        from pdf2image import convert_from_bytes
        libraries['pdf2image'] = True
        print("✅ pdf2image available")
    except ImportError:
        print("❌ pdf2image not available")
    
    return libraries

if __name__ == "__main__":
    # Test setup
    available_libs = setup_image_processing()
    print(f"\n📊 Available libraries: {sum(available_libs.values())}/{len(available_libs)}")
    
    # Create processor
    processor = EnhancedImageProcessor()
    print("✅ Enhanced image processor created")
    
    # Create direct sender
    sender = DirectImageSender()
    print("✅ Direct image sender created") 