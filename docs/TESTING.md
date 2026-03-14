# Testing Guide

## Backend Tests (Python/FastAPI)

### Setup

```bash
cd backend
source .venv/bin/activate    # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### Running Tests

```bash
pytest                                    # All tests
pytest -v                                 # Verbose output
pytest --cov=app --cov-report=html        # With coverage report
pytest tests/test_api_samples.py          # Specific file
pytest tests/test_api_samples.py::TestCreateSample::test_create_sample_success  # Specific test
```

### Test Structure

```
backend/
├── tests/
│   ├── conftest.py              # Test fixtures and configuration
│   └── test_api_samples.py      # API endpoint tests
└── pytest.ini                   # Pytest configuration
```

### Coverage

- Health check endpoint
- Sample CRUD (create, list, update, delete)
- Sample validation and duplicate detection
- Status filtering

## Frontend Tests (React/TypeScript)

### Setup

```bash
cd frontend
npm install
```

### Running Tests

```bash
npm test                        # All tests
npm test -- --watch             # Watch mode
npm run test:ui                 # With UI
npm run test:coverage           # With coverage
npm test -- src/App.test.tsx    # Specific file
```

### Test Structure

```
frontend/
├── src/
│   ├── test/
│   │   └── setup.ts            # Test setup
│   ├── App.test.tsx            # App component tests
│   └── lib/
│       └── api.test.ts         # API client tests
└── vitest.config.ts            # Vitest configuration
```

### Coverage

- App component rendering and loading states
- API health check integration
- API client configuration

## Running Tests in Docker

```bash
# Backend
docker compose run backend pytest -v
docker compose run backend pytest --cov=app

# Frontend
docker build -f frontend/Dockerfile.dev -t sample-frontend-dev frontend/
docker run sample-frontend-dev npm test
```

## Writing New Tests

### Backend

```python
import pytest

class TestMyFeature:
    def test_success(self, client):
        response = client.get("/my-endpoint")
        assert response.status_code == 200

    def test_error(self, client):
        response = client.get("/my-endpoint?invalid=true")
        assert response.status_code == 400
```

### Frontend

```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Expected Text')).toBeInTheDocument()
  })
})
```

## Related Docs

- [Development Guide](DEVELOPMENT.md) — Local setup
- [Docker Guide](DOCKER.md) — Running in Docker
