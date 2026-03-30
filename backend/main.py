from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from datetime import timedelta
from backend.app.routes.auth_routes import auth_bp
from backend.app.routes.exam_routes import exam_bp
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# JWT configuration
app.config["JWT_SECRET_KEY"] = "super-secret-key-change-later"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=6)

# Initialize JWT
jwt = JWTManager(app)

# Enable CORS so React frontend can call Flask API
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# Register routes
app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(exam_bp, url_prefix="/exam")

if __name__ == "__main__":
    app.run(debug=True)