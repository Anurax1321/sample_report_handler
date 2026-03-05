# Windows Setup Guide

This guide will help you set up the NBS Sample Report Handler on Windows.

## Prerequisites

Before you begin, ensure you have the following installed:

### 1. Python 3.10 or higher
- Download from https://www.python.org/downloads/
- **IMPORTANT**: During installation, check "Add Python to PATH"

### 2. Node.js (LTS version)
- Download from https://nodejs.org/
- The LTS (Long Term Support) version is recommended

### 3. Git (Optional but recommended)
- Download from https://git-scm.com/download/win

## Installation Steps

### Option 1: Using the Startup Script (Recommended)

1. **Open Command Prompt or PowerShell** in the project directory
2. Run the startup script:
   ```cmd
   start.bat
   ```
3. The script will automatically:
   - Create Python virtual environment
   - Install backend dependencies
   - Install frontend dependencies
   - Start both servers

### Option 2: Manual Setup

If the automatic script fails, follow these manual steps:

#### Backend Setup

1. **Navigate to the backend directory:**
   ```cmd
   cd backend
   ```

2. **Create a virtual environment:**
   ```cmd
   python -m venv .venv
   ```

3. **Activate the virtual environment:**
   ```cmd
   .venv\Scripts\activate
   ```

4. **Upgrade pip (important for Windows):**
   ```cmd
   python -m pip install --upgrade pip
   ```

5. **Install dependencies:**
   ```cmd
   pip install -r requirements.txt
   ```

   **If you get pandas/numpy build errors**, try:
   ```cmd
   pip install --only-binary :all: pandas numpy
   pip install -r requirements.txt
   ```

6. **Run database migrations:**
   ```cmd
   alembic upgrade head
   ```

7. **Start the backend server:**
   ```cmd
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

#### Frontend Setup

1. **Open a NEW Command Prompt/PowerShell window**

2. **Navigate to the frontend directory:**
   ```cmd
   cd frontend
   ```

3. **Install dependencies:**
   ```cmd
   npm install
   ```

4. **Start the development server:**
   ```cmd
   npm run dev
   ```

## Accessing the Application

Once both servers are running:

- **Frontend (UI)**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Troubleshooting

### Error: "pandas" or "numpy" build failed

**Solution 1**: Install precompiled wheels
```cmd
pip install --only-binary :all: pandas numpy
```

**Solution 2**: Install Microsoft C++ Build Tools
1. Download from: https://visualstudio.microsoft.com/downloads/
2. Select "Build Tools for Visual Studio"
3. Install "Desktop development with C++"
4. Restart your computer
5. Try `pip install -r requirements.txt` again

**Solution 3**: Use a different Python version
- Python 3.10 or 3.11 have better precompiled wheel availability
- Avoid Python 3.12+ if possible (newer, fewer wheels)

### Error: "npm" command not found

**Solution**:
- Ensure Node.js is installed
- Restart your terminal/Command Prompt
- Check installation: `node --version` and `npm --version`

### Error: Port already in use

**For Backend (port 8000):**
```cmd
# Find process using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**For Frontend (port 5173):**
```cmd
# Find process using port 5173
netstat -ano | findstr :5173

# Kill the process
taskkill /PID <PID> /F
```

### Error: "Python was not found"

**Solution**:
1. Reinstall Python from https://www.python.org/downloads/
2. **CRITICAL**: Check "Add Python to PATH" during installation
3. Restart your computer
4. Verify: `python --version`

### Error: Virtual environment activation fails

**In PowerShell**:
```powershell
# Enable script execution
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Then activate
.venv\Scripts\Activate.ps1
```

**In Command Prompt**:
```cmd
.venv\Scripts\activate.bat
```

### Database Issues

**Reset the database**:
```cmd
# In backend directory
del app.db
alembic upgrade head
```

## Development Tips

### Running Servers in Separate Windows

1. **Backend** (Command Prompt 1):
   ```cmd
   cd backend
   .venv\Scripts\activate
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

2. **Frontend** (Command Prompt 2):
   ```cmd
   cd frontend
   npm run dev
   ```

### Stopping Servers

- Press `Ctrl + C` in each terminal window
- Or close the terminal windows

## Next Steps

After successful setup:

1. **Access the application**: http://localhost:5173
2. **Try Sample Entry**: Navigate to "Sample Entry" → "New Entry"
3. **Upload Reports**: Navigate to "Report Analyzer" to upload and process reports
4. **View Samples**: Navigate to "Sample Entry" → "Tracking" to view all samples

## Getting Help

If you encounter issues not covered here:

1. Check the error message carefully
2. Search for the error online
3. Ensure all prerequisites are properly installed
4. Try the manual setup steps
5. Restart your computer and try again

## Environment Variables (Optional)

Create a `.env` file in the `backend` directory if you need custom settings:

```env
DATABASE_URL=sqlite:///./app.db
CORS_ORIGINS=["http://localhost:5173"]
```

## Production Deployment (Windows Server)

For production on Windows Server:

1. Use **IIS** with **FastCGI** for Python
2. Use **IIS** or **nginx** for serving the React frontend
3. Configure proper database (PostgreSQL recommended over SQLite)
4. Set up SSL certificates
5. Configure Windows Firewall rules

Contact your system administrator for production deployment assistance.
