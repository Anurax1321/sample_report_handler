import os
import subprocess
import asyncio
from fastapi import APIRouter, Header, HTTPException

router = APIRouter(tags=["deploy"])

DEPLOY_SECRET = os.environ.get("DEPLOY_SECRET", "")
PROJECT_DIR = "/host-project"
COMPOSE_FILE = f"{PROJECT_DIR}/docker-compose.prod.yml"
ENV_FILE = f"{PROJECT_DIR}/.env.prod"


@router.post("/webhook/deploy")
async def webhook_deploy(x_deploy_secret: str = Header(...)):
    if not DEPLOY_SECRET or x_deploy_secret != DEPLOY_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")

    # Run git pull + rebuild in background so the response returns immediately
    asyncio.create_task(_run_deploy())
    return {"status": "deploy triggered"}


async def _run_deploy():
    """Pull latest code and rebuild containers on the host."""
    try:
        proc = await asyncio.create_subprocess_exec(
            "bash", "-c",
            f"cd {PROJECT_DIR} && git pull origin main && "
            f"docker compose -f {COMPOSE_FILE} --env-file {ENV_FILE} up -d --build",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()
        if proc.returncode != 0:
            print(f"[deploy] FAILED (exit {proc.returncode}):\n{stderr.decode()}", flush=True)
        else:
            print(f"[deploy] SUCCESS:\n{stdout.decode()[-500:]}", flush=True)
    except Exception as e:
        print(f"[deploy] ERROR: {e}", flush=True)
