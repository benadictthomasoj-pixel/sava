from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import bcrypt
import jwt

from app.config import JWT_SECRET_KEY, JWT_ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


def hash_password(password: str) -> str:
    """
    Securely hashes a plaintext password using bcrypt with an automatically generated salt
    and standard work factor (12 rounds).
    Rejects empty passwords and passwords exceeding bcrypt's 72-byte maximum length limit.
    """
    if not password or not isinstance(password, str):
        raise ValueError("Password must be a non-empty string.")
    
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > 72:
        raise ValueError("Password exceeds maximum allowed length of 72 bytes.")
    
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifies a plaintext password against a stored bcrypt hash in constant time.
    Returns False safely if inputs are missing, invalid, or do not match.
    """
    if not plain_password or not hashed_password:
        return False
    try:
        plain_bytes = plain_password.encode("utf-8")
        hash_bytes = hashed_password.encode("utf-8")
        return bcrypt.checkpw(plain_bytes, hash_bytes)
    except Exception:
        return False


def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Generates a cryptographically signed, expiring JWT access token using the configured secret key.
    Includes subject ('sub'), issue timestamp ('iat'), and expiration timestamp ('exp').
    """
    to_encode = data.copy()
    now_utc = datetime.now(timezone.utc)
    if expires_delta:
        expire = now_utc + expires_delta
    else:
        expire = now_utc + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({
        "exp": expire,
        "iat": now_utc,
    })
    
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> Dict[str, Any]:
    """
    Decodes and verifies a JWT access token's signature, algorithm, and expiration.
    Raises jwt.ExpiredSignatureError if expired.
    Raises jwt.PyJWTError if the token is invalid or tampered with.
    """
    return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
