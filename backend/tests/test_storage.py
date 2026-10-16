"""Unit tests for private storage abstraction and user isolation."""
import pytest
import tempfile
from pathlib import Path
from app.core.storage import LocalPrivateStorage


@pytest.mark.asyncio
async def test_local_private_storage_basic_flow():
    with tempfile.TemporaryDirectory() as temp_dir:
        storage = LocalPrivateStorage(base_dir=temp_dir)
        user_id = "user_abc_123"
        content = b"Candidate resume contents strictly confidential."
        
        # Save file
        rel_path = await storage.save_file(user_id, "resume.pdf", content)
        assert rel_path is not None
        assert user_id in rel_path
        
        # Check existence
        exists = await storage.file_exists(user_id, rel_path)
        assert exists is True
        
        # Read file
        read_content = await storage.get_file(user_id, rel_path)
        assert read_content == content
        
        # Delete file
        deleted = await storage.delete_file(user_id, rel_path)
        assert deleted is True
        assert await storage.file_exists(user_id, rel_path) is False


@pytest.mark.asyncio
async def test_storage_cross_user_isolation():
    with tempfile.TemporaryDirectory() as temp_dir:
        storage = LocalPrivateStorage(base_dir=temp_dir)
        user_a = "user_alpha"
        user_b = "user_beta"
        content_a = b"User A private notes"
        
        file_a = await storage.save_file(user_a, "notes.txt", content_a)
        
        # User B cannot access User A's file
        read_by_b = await storage.get_file(user_b, file_a)
        assert read_by_b is None


@pytest.mark.asyncio
async def test_storage_path_traversal_prevention():
    with tempfile.TemporaryDirectory() as temp_dir:
        storage = LocalPrivateStorage(base_dir=temp_dir)
        user_id = "user_gamma"
        
        # Path traversal with ../
        traversal_path = "../../etc/passwd"
        assert await storage.get_file(user_id, traversal_path) is None
