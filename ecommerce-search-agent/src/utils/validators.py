import base64
from fastapi import HTTPException

def validate_base64_image(image_base64: str) -> None:
    try:
        base64.b64decode(image_base64)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 image data") 