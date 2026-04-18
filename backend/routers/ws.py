import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from job_store import get_job, register_ws, unregister_ws

router = APIRouter()


@router.websocket("/ws/{job_id}")
async def websocket_endpoint(websocket: WebSocket, job_id: str):
    await websocket.accept()

    job = get_job(job_id)
    if not job:
        await websocket.send_json({"type": "error", "message": "Job not found"})
        await websocket.close()
        return

    # Replay buffered events for reconnect
    for event in job.ws_events:
        await websocket.send_json(event)

    async def send_fn(event_dict: dict):
        await websocket.send_json(event_dict)

    register_ws(job_id, send_fn)
    try:
        while True:
            # Keep connection alive; client sends nothing
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        unregister_ws(job_id, send_fn)
