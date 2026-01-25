from flask import Blueprint, request, jsonify
from backend.app.services.auth_service import get_user_role
from flask_jwt_extended import create_access_token
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
        token = create_access_token(identity=str(result['user_id']))
        return jsonify({
            "message": "Login successful",
            "access_token": token
        }),200
    else:
        return jsonify({"error": result}), 401


from flask_jwt_extended import jwt_required, get_jwt_identity

@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    return jsonify({
        "message": "Access granted",
        "user_id": user_id
    }), 200

@auth_bp.route("/admin-only", methods=["GET"])
@jwt_required()
def admin_only():
    user_id = int(get_jwt_identity())
    role = get_user_role(user_id)

    if role != "admin":
        return jsonify({"error": "Admin access required"}), 403

    return jsonify({"message": "Welcome Admin"}), 200

@auth_bp.route("/student-only", methods=["GET"])
@jwt_required()
def student_only():
    user_id = int(get_jwt_identity())
    role = get_user_role(user_id)

    if role != "student":
        return jsonify({"error": "Student access required"}), 403

    return jsonify({"message": "Welcome Student"}), 200


