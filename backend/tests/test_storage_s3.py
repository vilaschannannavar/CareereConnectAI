"""Tests for S3Storage cloud storage backend using moto mock."""
import pytest
import boto3
from moto import mock_aws
from app.core.storage import S3Storage


@pytest.mark.asyncio
async def test_s3_storage_lifecycle_with_moto():
    """Test S3 save, get, exists, delete, and delete_all_user_files with moto mock."""
    with mock_aws():
        # Create mock S3 bucket
        s3 = boto3.client("s3", region_name="us-east-1")
        bucket_name = "test-careerconnect-resumes"
        s3.create_bucket(Bucket=bucket_name)

        storage = S3Storage(
            bucket_name=bucket_name,
            region_name="us-east-1",
            access_key="mock_key",
            secret_key="mock_secret",
        )

        user_id = "test-user-uuid-1234"
        file_content = b"%PDF-1.4 Mock resume content for testing S3 storage."
        filename = "resume.pdf"

        # 1. Save file
        key = await storage.save_file(user_id, filename, file_content)
        assert key.startswith(user_id)
        assert "resume.pdf" in key

        # 2. Check exists
        exists = await storage.file_exists(user_id, key)
        assert exists is True

        # 3. Retrieve file
        retrieved = await storage.get_file(user_id, key)
        assert retrieved == file_content

        # 4. Foreign user cannot access
        foreign_retrieved = await storage.get_file("foreign-user-5678", key)
        assert foreign_retrieved is None

        # 5. Delete file
        deleted = await storage.delete_file(user_id, key)
        assert deleted is True

        # Verify no longer exists
        exists_after = await storage.file_exists(user_id, key)
        assert exists_after is False

        # 6. Delete all user files
        key2 = await storage.save_file(user_id, "doc2.pdf", b"Content 2")
        key3 = await storage.save_file(user_id, "doc3.pdf", b"Content 3")
        assert await storage.file_exists(user_id, key2) is True
        assert await storage.file_exists(user_id, key3) is True

        purge_result = await storage.delete_all_user_files(user_id)
        assert purge_result is True
        assert await storage.file_exists(user_id, key2) is False
        assert await storage.file_exists(user_id, key3) is False
