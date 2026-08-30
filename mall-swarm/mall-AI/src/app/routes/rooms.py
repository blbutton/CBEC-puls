from flask import Blueprint, jsonify, request

from ..rooms import manager

bp = Blueprint("rooms", __name__)


@bp.get("/api/rooms")
def list_rooms():
    return jsonify(
        [{"name": r.name, "online": len(r.connections)} for r in manager.list_rooms()]
    )


@bp.post("/api/rooms")
def create_room():
    name = request.args.get("name") or (request.get_json(silent=True) or {}).get("name")
    if not name:
        return jsonify({"detail": "name is required"}), 400
    r = manager.get_or_create(name)
    return jsonify({"name": r.name, "online": len(r.connections)})
