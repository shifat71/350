import base64
from fastapi import HTTPException
import re

def validate_base64_image(image_base64: str) -> str:
    """
    Validate base64 image data and return properly formatted data URL.
    
    Args:
        image_base64: Base64-encoded image data (with or without data URL prefix)
        
    Returns:
        Properly formatted data URL for the image
        
    Raises:
        HTTPException: If the image data is invalid
    """
    try:
        # Remove any whitespace
        image_base64 = image_base64.strip()
        
        # Handle data URL format
        if image_base64.startswith('data:image/'):
            # Extract the base64 part after the comma
            match = re.match(r'data:image/(\w+);base64,(.+)', image_base64)
            if not match:
                raise ValueError("Invalid data URL format")
            mime_type, base64_data = match.groups()
            if mime_type not in ['jpeg', 'jpg', 'png', 'gif', 'webp']:
                raise ValueError(f"Unsupported image type: {mime_type}")
            return image_base64
        else:
            # Try to decode the base64 data
            try:
                decoded = base64.b64decode(image_base64)
            except Exception as e:
                raise ValueError(f"Invalid base64 encoding: {str(e)}")
            
            # Basic validation that it's an image
            if len(decoded) < 100:  # Minimum size for a valid image
                raise ValueError("Image data too small")
            
            # Detect image type from signature
            if decoded.startswith(b'\xff\xd8'):
                mime_type = 'jpeg'
            elif decoded.startswith(b'\x89PNG'):
                mime_type = 'png'
            elif decoded.startswith(b'GIF87a') or decoded.startswith(b'GIF89a'):
                mime_type = 'gif'
            elif decoded.startswith(b'RIFF') and decoded[8:12] == b'WEBP':
                mime_type = 'webp'
            else:
                raise ValueError("Invalid image format")
            
            # Return properly formatted data URL
            return f"data:image/{mime_type};base64,{image_base64}"
            
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image data: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Error processing image: {str(e)}"
        ) 