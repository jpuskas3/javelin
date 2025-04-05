from flask import Flask, send_from_directory, request, jsonify
from flask import Flask, send_from_directory, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, login_required, current_user, logout_user
from models import db, User, SavedPoint
import os
from PIL import Image

app = Flask(__name__, static_folder="static")

app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['UPLOAD_FOLDER'] = 'static/uploads'

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

@app.route("/")
def serve_index():
    return send_from_directory("static", "index.html")

@app.route("/api/hello")
def hello():
    return {"message": "Hello from Flask API!"}

@app.route('/saved_points', methods=['GET'])
@login_required
def saved_points():
    points = SavedPoint.query.filter_by(user_id=current_user.id).all()
    return jsonify([
        {'image': point.image_filename, 'volume': point.volume, 'date': point.date_saved}
        for point in points
    ])

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(host="0.0.0.0", port=5000)
