from flask import Blueprint, request, jsonify
from backend.app.services.auth_service import register_user, login_user

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.json
    register_user(
        name=data["name"],
        email=data["email"],
        password=data["password"],
        role="student"
    )
    return jsonify({"message": "User registered"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json
    success, result = login_user(data["email"], data["password"])

    if success:
        return jsonify({"message": "Login successful"}), 200
    else:
        return jsonify({"error": result}), 401
