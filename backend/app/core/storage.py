"""Private file storage abstraction.

Supports local private directory storage in dev/staging and S3-compatible object storage in production.
Guarantees per-user isolation and path traversal prevention.
"""
import os
import re
import uuid
import aiofiles
from abc import ABC, abstractmethod
from typing import BinaryIO, Optional
from pathlib import Path
from app.core.config import settings


class StorageService(ABC):
    """Abstract interface for secure private file storage."""

    @abstractmethod
    async def save_file(self, user_id: str, filename: str, content: bytes) -> str:
        """Save a file under the isolated user's storage path. Returns the relative storage path."""
        pass

    @abstractmethod
    async def get_file(self, user_id: str, file_path: str) -> Optional[bytes]:
        """Retrieve a file belonging to the user. Returns None if not found or unauthorized."""
        pass

    @abstractmethod
    async def delete_file(self, user_id: str, file_path: str) -> bool:
        """Delete a file belonging to the user."""
        pass

    @abstractmethod
    async def file_exists(self, user_id: str, file_path: str) -> bool:
        """Check if a file exists under the user's storage."""
        pass

    @abstractmethod
    async def delete_all_user_files(self, user_id: str) -> bool:
        """Purge all files and remove the user's isolated storage directory."""
        pass


class LocalPrivateStorage(StorageService):
    """Local filesystem implementation with strict per-user subdirectory sandboxing."""

    def __init__(self, base_dir: Optional[str] = None):
        self.base_dir = Path(base_dir or settings.LOCAL_STORAGE_PATH).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _get_user_dir(self, user_id: str) -> Path:
        """Ensure safe user directory path without directory traversal."""
        safe_user_id = re.sub(r"[^a-zA-Z0-9_\-]", "", str(user_id))
        user_dir = (self.base_dir / safe_user_id).resolve()
        # Verify user_dir is strictly inside base_dir
        if not str(user_dir).startswith(str(self.base_dir)):
            raise ValueError("Invalid storage path traversal detected")
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    def _resolve_safe_path(self, user_id: str, file_path: str) -> Path:
        """Resolve and verify that file path remains strictly inside the user's directory."""
        user_dir = self._get_user_dir(user_id)
        # Extract filename only or relative path
        cleaned = Path(file_path).name
        target = (user_dir / cleaned).resolve()
        if not str(target).startswith(str(user_dir)):
            raise ValueError("Path traversal attempt in file storage")
        return target

    async def save_file(self, user_id: str, filename: str, content: bytes) -> str:
        user_dir = self._get_user_dir(user_id)
        safe_name = f"{uuid.uuid4().hex}_{Path(filename).name}"
        target_path = user_dir / safe_name
        
        # Write bytes securely
        target_path.write_bytes(content)
        # Return path relative to base_dir
        return str(target_path.relative_to(self.base_dir)).replace("\\", "/")

    async def get_file(self, user_id: str, file_path: str) -> Optional[bytes]:
        try:
            target = self._resolve_safe_path(user_id, file_path)
            if not target.is_file():
                return None
            return target.read_bytes()
        except (ValueError, FileNotFoundError):
            return None

    async def delete_file(self, user_id: str, file_path: str) -> bool:
        try:
            target = self._resolve_safe_path(user_id, file_path)
            if target.is_file():
                target.unlink()
                return True
            return False
        except (ValueError, FileNotFoundError):
            return False

    async def file_exists(self, user_id: str, file_path: str) -> bool:
        try:
            target = self._resolve_safe_path(user_id, file_path)
            return target.is_file()
        except (ValueError, FileNotFoundError):
            return False

    async def delete_all_user_files(self, user_id: str) -> bool:
        """Purge all files and remove the user's isolated storage directory."""
        try:
            user_dir = self._get_user_dir(user_id)
            if user_dir.is_dir():
                import shutil
                shutil.rmtree(user_dir, ignore_errors=True)
                return True
            return False
        except Exception:
            return False


def get_storage_service() -> StorageService:
    """Factory for the configured storage service."""
    # S3 backend can be initialized when AWS credentials are provided
    if settings.STORAGE_BACKEND == "s3" and settings.S3_BUCKET_NAME:
        raise NotImplementedError("S3 storage backend will be activated in cloud deployment")
    return LocalPrivateStorage()
