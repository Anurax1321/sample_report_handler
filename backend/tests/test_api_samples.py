import pytest
from datetime import datetime


class TestHealthEndpoint:
    """Test health check endpoint"""

    def test_health_check(self, client):
        """Test that health endpoint returns 200 OK"""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}


class TestCreateSample:
    """Test sample creation endpoint"""

    def test_create_sample_success(self, client):
        """Test creating a valid sample"""
        sample_data = {
            "sample_code": "SAMP-001",
            "test_type": "Blood Test",
            "collected_by": "Dr. Smith",
            "priority": "normal",
            "notes": "Routine checkup",
            "sample_metadata": {"lab": "Lab A", "room": "101"}
        }
        response = client.post("/samples", json=sample_data)
        assert response.status_code == 200
        data = response.json()
        assert data["sample_code"] == "SAMP-001"
        assert data["test_type"] == "Blood Test"
        assert data["status"] == "received"
        assert data["priority"] == "normal"
        assert data["sample_metadata"] == {"lab": "Lab A", "room": "101"}
        assert "id" in data
        assert "collected_at" in data

    def test_create_sample_duplicate_code(self, client):
        """Test that duplicate sample codes are rejected"""
        sample_data = {
            "sample_code": "SAMP-002",
            "test_type": "Blood Test",
            "collected_by": "Dr. Smith"
        }
        # Create first sample
        response1 = client.post("/samples", json=sample_data)
        assert response1.status_code == 200

        # Try to create duplicate
        response2 = client.post("/samples", json=sample_data)
        assert response2.status_code == 400
        assert "already exists" in response2.json()["detail"].lower()

    def test_create_sample_minimal_data(self, client):
        """Test creating sample with only required fields"""
        sample_data = {
            "sample_code": "SAMP-003",
            "test_type": "Urine Test",
            "collected_by": "Dr. Jones"
        }
        response = client.post("/samples", json=sample_data)
        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == ""
        assert data["priority"] == "normal"
        assert data["sample_metadata"] == {}

    def test_create_sample_missing_required_field(self, client):
        """Test that missing required fields cause validation error"""
        sample_data = {
            "sample_code": "SAMP-004",
            "test_type": "Blood Test"
            # Missing collected_by
        }
        response = client.post("/samples", json=sample_data)
        assert response.status_code == 422  # Validation error


class TestListSamples:
    """Test sample listing endpoint"""

    def test_list_samples_empty(self, client):
        """Test listing samples when database is empty"""
        response = client.get("/samples")
        assert response.status_code == 200
        assert response.json() == []

    def test_list_samples_multiple(self, client):
        """Test listing multiple samples"""
        # Create 3 samples
        for i in range(1, 4):
            sample_data = {
                "sample_code": f"SAMP-{i:03d}",
                "test_type": "Blood Test",
                "collected_by": "Dr. Smith"
            }
            client.post("/samples", json=sample_data)

        response = client.get("/samples")
        assert response.status_code == 200
        samples = response.json()
        assert len(samples) == 3

    def test_list_samples_filter_by_status(self, client):
        """Test filtering samples by status"""
        # Create samples with different statuses
        sample1_data = {
            "sample_code": "SAMP-010",
            "test_type": "Blood Test",
            "collected_by": "Dr. Smith"
        }
        response = client.post("/samples", json=sample1_data)
        sample1_id = response.json()["id"]

        sample2_data = {
            "sample_code": "SAMP-011",
            "test_type": "Urine Test",
            "collected_by": "Dr. Jones"
        }
        response = client.post("/samples", json=sample2_data)
        sample2_id = response.json()["id"]

        # Update one sample to processing
        client.patch(f"/samples/{sample1_id}/status", json={"status": "processing"})

        # Filter by received status
        response = client.get("/samples?status=received")
        assert response.status_code == 200
        samples = response.json()
        assert len(samples) == 1
        assert samples[0]["sample_code"] == "SAMP-011"

        # Filter by processing status
        response = client.get("/samples?status=processing")
        assert response.status_code == 200
        samples = response.json()
        assert len(samples) == 1
        assert samples[0]["sample_code"] == "SAMP-010"


class TestUpdateSampleStatus:
    """Test sample status update endpoint"""

    def test_update_status_success(self, client):
        """Test successfully updating sample status"""
        # Create a sample
        sample_data = {
            "sample_code": "SAMP-020",
            "test_type": "Blood Test",
            "collected_by": "Dr. Smith"
        }
        response = client.post("/samples", json=sample_data)
        sample_id = response.json()["id"]

        # Update status to processing
        response = client.patch(
            f"/samples/{sample_id}/status",
            json={"status": "processing"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"

        # Update to completed
        response = client.patch(
            f"/samples/{sample_id}/status",
            json={"status": "completed"}
        )
        assert response.status_code == 200
        assert response.json()["status"] == "completed"

    def test_update_status_invalid_status(self, client):
        """Test updating with invalid status value"""
        # Create a sample
        sample_data = {
            "sample_code": "SAMP-021",
            "test_type": "Blood Test",
            "collected_by": "Dr. Smith"
        }
        response = client.post("/samples", json=sample_data)
        sample_id = response.json()["id"]

        # Try invalid status
        response = client.patch(
            f"/samples/{sample_id}/status",
            json={"status": "invalid_status"}
        )
        assert response.status_code == 422  # Validation error

    def test_update_status_nonexistent_sample(self, client):
        """Test updating status of non-existent sample"""
        response = client.patch(
            "/samples/99999/status",
            json={"status": "processing"}
        )
        assert response.status_code == 404


class TestDeleteSample:
    """Test sample deletion endpoint"""

    def test_delete_sample_success(self, client):
        """Test successfully deleting a sample"""
        # Create a sample
        sample_data = {
            "sample_code": "SAMP-030",
            "test_type": "Blood Test",
            "collected_by": "Dr. Smith"
        }
        response = client.post("/samples", json=sample_data)
        sample_id = response.json()["id"]

        # Delete the sample
        response = client.delete(f"/samples/{sample_id}")
        assert response.status_code == 200
        assert "deleted successfully" in response.json()["message"].lower()

        # Verify it's gone
        response = client.get("/samples")
        assert len(response.json()) == 0

    def test_delete_nonexistent_sample(self, client):
        """Test deleting a non-existent sample"""
        response = client.delete("/samples/99999")
        assert response.status_code == 404
