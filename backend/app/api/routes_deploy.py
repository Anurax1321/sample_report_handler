import os
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
    """Pull latest code and rebuild containers on the host.

    Uses 'setsid' + 'nohup' so the docker compose rebuild survives
    this container being replaced during the upgrade.
    """
    try:
        # Step 1: git pull (safe to run inside the container)
        pull = await asyncio.create_subprocess_exec(
            "bash", "-c",
            f"git config --global --add safe.directory {PROJECT_DIR} && "
            f"cd {PROJECT_DIR} && git pull origin main",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, stderr = await pull.communicate()
        if pull.returncode != 0:
            print(f"[deploy] git pull FAILED:\n{stderr.decode()}", flush=True)
            return

        print(f"[deploy] git pull OK:\n{stdout.decode()[-300:]}", flush=True)

        # Step 2: rebuild via a fully detached host-level process
        # setsid creates a new session so the process survives container restart
        rebuild_cmd = (
            f"setsid nohup docker compose -p sample_report_handler "
            f"-f {COMPOSE_FILE} --env-file {ENV_FILE} "
            f"up -d --build > /tmp/deploy.log 2>&1 &"
        )
        proc = await asyncio.create_subprocess_exec(
            "bash", "-c", rebuild_cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        await proc.communicate()
        print("[deploy] rebuild launched (detached)", flush=True)

    except Exception as e:
        print(f"[deploy] ERROR: {e}", flush=True)
