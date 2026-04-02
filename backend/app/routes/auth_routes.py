from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.services.auth_service import register_user, login_user

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    print("Incoming data:", data)

    required_fields = ["name", "email", "password", "organization"]
    if not data or not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    register_user(
        name=data["name"],
        email=data["email"],
        password=data["password"],
        organization=data["organization"]
    )

    return jsonify({"message": "User registered successfully"}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.json

    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Email and password required"}), 400

    success, result = login_user(data["email"], data["password"])

    if not success:
        return jsonify({"error": result}), 401

    token = create_access_token(identity=str(result["user_id"]))

    return jsonify({
        "access_token": token,
        "user": {
            "user_id": result["user_id"],
            "name": result["name"],
            "email": result["email"],
            "organization": result["organization"]
        }
    }), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    return jsonify({"message": "Access granted", "user_id": user_id}), 200