import os
import base64
import hashlib
from cryptography.fernet import Fernet
from app.core.config import SECRET_KEY

# Fernet requires a 32-byte url-safe base64-encoded key.
# We derive it from SECRET_KEY so it's always stable and available unless customized via ENCRYPTION_KEY.
encryption_key_raw = os.getenv("ENCRYPTION_KEY")
if not encryption_key_raw:
    key_bytes = hashlib.sha256(SECRET_KEY.encode()).digest()
    ENCRYPTION_KEY = base64.urlsafe_b64encode(key_bytes).decode()
else:
    ENCRYPTION_KEY = encryption_key_raw

cipher = Fernet(ENCRYPTION_KEY.encode())

def encrypt_password(password: str) -> str:
    return cipher.encrypt(password.encode()).decode()

def decrypt_password(encrypted_password: str) -> str:
    return cipher.decrypt(encrypted_password.encode()).decode()
