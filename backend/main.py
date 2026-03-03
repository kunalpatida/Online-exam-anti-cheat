from flask import Flask
from flask_jwt_extended import JWTManager 
from backend.app.routes.auth_routes import auth_bp
from backend.app.routes.exam_routes import exam_bp
from dotenv import load_dotenv
load_dotenv()

app = Flask(__name__)

app.config["JWT_SECRET_KEY"] = "super-secret-key-change-later"
jet = JWTManager(app)

app.register_blueprint(auth_bp, url_prefix="/auth")
app.register_blueprint(exam_bp, url_prefix="/exam")

if __name__ == "__main__":
    app.run(debug=True)
