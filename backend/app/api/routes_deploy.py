import os
from fastapi import APIRouter, Header, HTTPException

router = APIRouter(tags=["deploy"])

DEPLOY_SECRET = os.environ.get("DEPLOY_SECRET", "")
PROJECT_DIR = "/host-project"
TRIGGER_FILE = f"{PROJECT_DIR}/.deploy-trigger"


@router.post("/webhook/deploy")
async def webhook_deploy(x_deploy_secret: str = Header(...)):
    if not DEPLOY_SECRET or x_deploy_secret != DEPLOY_SECRET:
        raise HTTPException(status_code=403, detail="Invalid secret")

    # Single job: signal the host to run deploy.sh. The host's systemd
    # path unit watches TRIGGER_FILE and runs scripts/deploy.sh, which
    # handles `git pull` + rebuild on the host (where SSH keys work).
    try:
        with open(TRIGGER_FILE, "w") as f:
            f.write("deploy")
    except OSError as e:
        print(f"[deploy] failed to write trigger file: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"trigger write failed: {e}")

    print("[deploy] trigger file written, host will rebuild", flush=True)
    return {"status": "deploy triggered"}
