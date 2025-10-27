# Testing Guide

This document explains how to run tests for both the backend and frontend of the Sample Report Handler application.

## Backend Tests (Python/FastAPI)

### Prerequisites
- Python 3.13+
- Virtual environment activated
- Dependencies installed from `requirements.txt`

### Running Backend Tests

#### 1. Install Test Dependencies
```bash
cd backend
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Run All Tests
```bash
pytest
```

#### 3. Run with Verbose Output
```bash
pytest -v
```

#### 4. Run with Coverage Report
```bash
pytest --cov=app --cov-report=html
```

#### 5. Run Specific Test File
```bash
pytest tests/test_api_samples.py
```

#### 6. Run Specific Test Class
```bash
pytest tests/test_api_samples.py::TestCreateSample
```

#### 7. Run Specific Test Function
```bash
pytest tests/test_api_samples.py::TestCreateSample::test_create_sample_success
```

### Backend Test Structure

```
backend/
├── tests/
│   ├── __init__.py
│   ├── conftest.py          # Test fixtures and configuration
│   └── test_api_samples.py  # API endpoint tests
└── pytest.ini               # Pytest configuration
```

### Test Coverage

The backend tests cover:
- ✅ Health check endpoint
- ✅ Sample creation (valid, duplicate, minimal data, validation)
- ✅ Sample listing (empty, multiple, filtering by status)
- ✅ Sample status updates
- ✅ Sample deletion

## Frontend Tests (React/TypeScript)

### Prerequisites
- Node.js 20+
- Dependencies installed from `package.json`

### Running Frontend Tests

#### 1. Install Test Dependencies
```bash
cd frontend
npm install
```

#### 2. Run All Tests
```bash
npm test
```

#### 3. Run Tests in Watch Mode
```bash
npm test -- --watch
```

#### 4. Run Tests with UI
```bash
npm run test:ui
```

#### 5. Run with Coverage Report
```bash
npm run test:coverage
```

#### 6. Run Specific Test File
```bash
npm test -- src/App.test.tsx
```

### Frontend Test Structure

```
frontend/
├── src/
│   ├── test/
│   │   └── setup.ts         # Test setup and configuration
│   ├── App.test.tsx         # App component tests
│   └── lib/
│       └── api.test.ts      # API client tests
└── vitest.config.ts         # Vitest configuration
```

### Test Coverage

The frontend tests cover:
- ✅ App component rendering
- ✅ Loading states
- ✅ Success and error messages
- ✅ API health check integration
- ✅ API client configuration

## Running Tests in Docker

### Backend Tests in Docker
```bash
# Build the backend container
docker-compose build backend

# Run tests in container
docker-compose run backend pytest -v

# Run with coverage
docker-compose run backend pytest --cov=app
```

### Frontend Tests in Docker
```bash
# Build the frontend container (development)
docker build -f frontend/Dockerfile.dev -t sample-frontend-dev frontend/

# Run tests in container
docker run sample-frontend-dev npm test
```

## Continuous Integration

### GitHub Actions Example
```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.13'
      - run: cd backend && pip install -r requirements.txt
      - run: cd backend && pytest -v

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd frontend && npm install
      - run: cd frontend && npm test
```

## Test Best Practices

### Backend
1. Use test fixtures from `conftest.py` for database setup
2. Each test function gets a fresh database
3. Mock external dependencies when needed
4. Test both success and error cases
5. Use descriptive test names

### Frontend
1. Mock API calls to avoid network dependencies
2. Test component rendering, user interactions, and state changes
3. Use `@testing-library/react` for component testing
4. Clean up after each test automatically
5. Test accessibility where applicable

## Troubleshooting

### Backend Test Issues

**Issue: `ModuleNotFoundError`**
```bash
# Solution: Ensure virtual environment is activated
source .venv/bin/activate  # Unix
.venv\Scripts\activate     # Windows
```

**Issue: Database errors**
```bash
# Solution: Tests use in-memory SQLite, no setup needed
# If issues persist, check conftest.py fixtures
```

### Frontend Test Issues

**Issue: `Cannot find module '@testing-library/react'`**
```bash
# Solution: Install dependencies
npm install
```

**Issue: `ReferenceError: fetch is not defined`**
```bash
# Solution: Already configured in vitest.config.ts with jsdom
# Ensure you're using vitest globals
```

## Writing New Tests

### Backend Test Template
```python
import pytest

class TestMyFeature:
    """Test description"""

    def test_my_feature_success(self, client):
        """Test successful case"""
        response = client.get("/my-endpoint")
        assert response.status_code == 200

    def test_my_feature_error(self, client):
        """Test error case"""
        response = client.get("/my-endpoint?invalid=true")
        assert response.status_code == 400
```

### Frontend Test Template
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

## Summary

- **Backend**: Use `pytest` for Python/FastAPI tests
- **Frontend**: Use `vitest` for React/TypeScript tests
- Both have comprehensive test coverage
- Tests run in isolated environments
- Easy to run locally or in CI/CD pipelines
