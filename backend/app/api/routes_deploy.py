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


TRIGGER_FILE = f"{PROJECT_DIR}/.deploy-trigger"


async def _run_deploy():
    """Pull latest code, then signal the host to rebuild containers.

    Git pull runs inside this container. For the rebuild, we write a
    trigger file to the mounted host volume. A systemd path unit on
    the host watches for this file and runs deploy.sh.
    """
    try:
        # Step 1: git pull (runs inside this container via mounted volume)
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

        # Step 2: write trigger file for host systemd watcher
        with open(TRIGGER_FILE, "w") as f:
            f.write("deploy")
        print("[deploy] trigger file written, host will rebuild", flush=True)

    except Exception as e:
        print(f"[deploy] ERROR: {e}", flush=True)
