from flask import Blueprint, jsonify, request

from ..schemas import CodeSaveIn, CodeSaveOut
from ..services.code_service import save as save_code

bp = Blueprint("code", __name__)


@bp.post("/api/code/save")
def save_code_endpoint():
    body = request.get_json(force=True, silent=True) or {}
    try:
        data = CodeSaveIn.model_validate(body)
        path = save_code(data.room, data.filename, data.content)
    except ValueError as e:
        return jsonify({"detail": str(e)}), 400
    except Exception as e:
        return jsonify({"detail": str(e)}), 400
    return jsonify(CodeSaveOut(path=str(path), ok=True).model_dump())
