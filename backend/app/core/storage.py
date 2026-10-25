"""Private file storage abstraction.

Supports local private directory storage in dev/staging and S3-compatible object storage in production.
Guarantees per-user isolation and path traversal prevention.
"""
import os
import re
import uuid
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
        if not str(user_dir).startswith(str(self.base_dir)):
            raise ValueError("Invalid storage path traversal detected")
        user_dir.mkdir(parents=True, exist_ok=True)
        return user_dir

    def _resolve_safe_path(self, user_id: str, file_path: str) -> Path:
        """Resolve and verify that file path remains strictly inside the user's directory."""
        user_dir = self._get_user_dir(user_id)
        cleaned = Path(file_path).name
        target = (user_dir / cleaned).resolve()
        if not str(target).startswith(str(user_dir)):
            raise ValueError("Path traversal attempt in file storage")
        return target

    async def save_file(self, user_id: str, filename: str, content: bytes) -> str:
        user_dir = self._get_user_dir(user_id)
        safe_name = f"{uuid.uuid4().hex}_{Path(filename).name}"
        target_path = user_dir / safe_name
        target_path.write_bytes(content)
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


class S3Storage(StorageService):
    """S3-compatible object storage implementation (AWS S3, MinIO, Cloudflare R2).

    Guarantees user isolation via prefix sandboxing: {user_id}/{unique_filename}.
    """

    def __init__(
        self,
        bucket_name: Optional[str] = None,
        endpoint_url: Optional[str] = None,
        region_name: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
    ):
        import boto3
        from botocore.config import Config

        self.bucket_name = bucket_name or settings.S3_BUCKET_NAME or "careerconnect-resumes"
        endpoint = endpoint_url or settings.S3_ENDPOINT_URL
        region = region_name or settings.S3_REGION or "us-east-1"
        key_id = access_key or settings.S3_ACCESS_KEY_ID
        secret = secret_key or settings.S3_SECRET_ACCESS_KEY

        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint if endpoint else None,
            region_name=region,
            aws_access_key_id=key_id,
            aws_secret_access_key=secret,
            config=Config(signature_version="s3v4"),
        )

    def _get_s3_key(self, user_id: str, filename: str) -> str:
        safe_user_id = re.sub(r"[^a-zA-Z0-9_\-]", "", str(user_id))
        cleaned_filename = Path(filename).name
        return f"{safe_user_id}/{cleaned_filename}"

    async def save_file(self, user_id: str, filename: str, content: bytes) -> str:
        safe_name = f"{uuid.uuid4().hex}_{Path(filename).name}"
        key = self._get_s3_key(user_id, safe_name)
        self.client.put_object(
            Bucket=self.bucket_name,
            Key=key,
            Body=content,
            ServerSideEncryption="AES256",
        )
        return key

    async def get_file(self, user_id: str, file_path: str) -> Optional[bytes]:
        try:
            key = self._get_s3_key(user_id, file_path)
            response = self.client.get_object(Bucket=self.bucket_name, Key=key)
            return response["Body"].read()
        except Exception:
            return None

    async def delete_file(self, user_id: str, file_path: str) -> bool:
        try:
            key = self._get_s3_key(user_id, file_path)
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception:
            return False

    async def file_exists(self, user_id: str, file_path: str) -> bool:
        try:
            key = self._get_s3_key(user_id, file_path)
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except Exception:
            return False

    async def delete_all_user_files(self, user_id: str) -> bool:
        try:
            safe_user_id = re.sub(r"[^a-zA-Z0-9_\-]", "", str(user_id))
            prefix = f"{safe_user_id}/"
            paginator = self.client.get_paginator("list_objects_v2")
            for page in paginator.paginate(Bucket=self.bucket_name, Prefix=prefix):
                items = page.get("Contents", [])
                if items:
                    delete_keys = [{"Key": obj["Key"]} for obj in items]
                    self.client.delete_objects(
                        Bucket=self.bucket_name,
                        Delete={"Objects": delete_keys},
                    )
            return True
        except Exception:
            return False


def get_storage_service() -> StorageService:
    """Factory for the configured storage service."""
    if settings.STORAGE_BACKEND == "s3" and settings.S3_BUCKET_NAME:
        return S3Storage()
    return LocalPrivateStorage()
