"""
Test script for Analyzer API endpoints
Run this to verify the API works before frontend integration
"""

import requests
import json
from pathlib import Path


BASE_URL = "http://localhost:8000"
ANALYZER_URL = f"{BASE_URL}/api/analyzer"


def test_health_check():
    """Test the analyzer health check endpoint."""
    print("=" * 80)
    print("TEST 1: Health Check")
    print("=" * 80)

    try:
        response = requests.get(f"{ANALYZER_URL}/health")
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            print("✓ Health check passed!")
            return True
        else:
            print("✗ Health check failed!")
            return False

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_single_pdf_upload():
    """Test single PDF upload and analysis."""
    print("\n" + "=" * 80)
    print("TEST 2: Single PDF Upload & Analysis")
    print("=" * 80)

    # Path to test PDF
    pdf_path = Path(__file__).parent / "test_reports" / "report1.pdf"

    if not pdf_path.exists():
        print(f"✗ Test file not found: {pdf_path}")
        return False

    try:
        # Upload PDF
        print(f"\nUploading: {pdf_path.name}")
        with open(pdf_path, 'rb') as f:
            files = {'file': (pdf_path.name, f, 'application/pdf')}
            response = requests.post(f"{ANALYZER_URL}/analyze-pdf", files=files)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"\n✓ Success: {data['message']}")

            result = data['result']
            summary = result['summary']

            print(f"\nPatient Info:")
            patient = result['patient_info']
            for key, value in patient.items():
                if value:
                    print(f"  - {key}: {value}")

            print(f"\nAnalysis Summary:")
            print(f"  - Total Tests: {summary['total_tests']}")
            print(f"  - Normal: {summary['normal_count']}")
            print(f"  - Abnormal: {summary['abnormal_count']}")
            print(f"  - Status: {summary['status'].upper()}")

            if result['abnormalities']:
                print(f"\nAbnormalities Found: {len(result['abnormalities'])}")
                for i, abn in enumerate(result['abnormalities'][:3], 1):
                    print(f"  {i}. {abn['category']}: {abn['analyte']}")
                    print(f"     Value: {abn['value']} {abn['unit']}")
                    print(f"     Reference: {abn['reference_range']}")
                    print(f"     Reason: {abn['reason']}")
                if len(result['abnormalities']) > 3:
                    print(f"  ... and {len(result['abnormalities']) - 3} more")
            else:
                print("\n✓ No abnormalities detected!")

            print("\n✓ Single PDF analysis test passed!")
            return True

        else:
            print(f"✗ Request failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False

    except Exception as e:
        print(f"✗ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_invalid_file_type():
    """Test that non-PDF files are rejected."""
    print("\n" + "=" * 80)
    print("TEST 3: Invalid File Type Rejection")
    print("=" * 80)

    try:
        # Try uploading this Python script as a PDF
        test_file = Path(__file__)
        print(f"\nAttempting to upload non-PDF file: {test_file.name}")

        with open(test_file, 'rb') as f:
            files = {'file': ('test.txt', f, 'text/plain')}
            response = requests.post(f"{ANALYZER_URL}/analyze-pdf", files=files)

        print(f"Status Code: {response.status_code}")

        if response.status_code == 400:
            print(f"Response: {response.json()}")
            print("✓ Invalid file correctly rejected!")
            return True
        else:
            print("✗ Expected 400 error for invalid file type")
            return False

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def test_api_documentation():
    """Test that API documentation is accessible."""
    print("\n" + "=" * 80)
    print("TEST 4: API Documentation")
    print("=" * 80)

    try:
        response = requests.get(f"{BASE_URL}/docs")
        print(f"Status Code: {response.status_code}")

        if response.status_code == 200:
            print("✓ API documentation accessible at http://localhost:8000/docs")
            return True
        else:
            print("✗ Could not access API documentation")
            return False

    except Exception as e:
        print(f"✗ Error: {e}")
        return False


def main():
    """Run all API tests."""
    print("\n" + "🧪" * 40)
    print("NEONATAL REPORT ANALYZER - API TEST SUITE")
    print("🧪" * 40)

    print("\nℹ️  Make sure the backend server is running:")
    print("   cd backend && uvicorn app.main:app --reload")
    print()

    # Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code != 200:
            print("❌ Backend server is not responding correctly!")
            print("   Please start the server first.")
            return 1
    except Exception as e:
        print("❌ Backend server is not running!")
        print(f"   Error: {e}")
        print("\n   Please start the server with:")
        print("   cd backend && uvicorn app.main:app --reload")
        return 1

    print("✓ Backend server is running\n")

    # Run tests
    tests_passed = 0
    tests_total = 4

    if test_health_check():
        tests_passed += 1

    if test_single_pdf_upload():
        tests_passed += 1

    if test_invalid_file_type():
        tests_passed += 1

    if test_api_documentation():
        tests_passed += 1

    # Summary
    print("\n" + "=" * 80)
    print(f"TEST SUMMARY: {tests_passed}/{tests_total} tests passed")
    print("=" * 80)

    if tests_passed == tests_total:
        print("\n✅ ALL API TESTS PASSED! Backend is ready for frontend integration.\n")
        print("Next step: Access the API docs to explore endpoints:")
        print("👉 http://localhost:8000/docs")
        return 0
    else:
        print(f"\n❌ {tests_total - tests_passed} test(s) failed.\n")
        return 1


if __name__ == "__main__":
    import sys
    sys.exit(main())
