from flask import Flask, render_template

app = Flask(__name__)

# Route to serve your HTML file
@app.route('/')
def home():
    return render_template('index.html')  # Flask will look for the HTML file in the "templates" folder

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
from flask import Flask, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_login import LoginManager, login_user, login_required, current_user, logout_user
from models import db, User, SavedPoint
import os
from PIL import Image

app = Flask(__name__)

app.config['SECRET_KEY'] = 'your_secret_key'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['UPLOAD_FOLDER'] = 'static/uploads'

db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# CLI function for signup
def signup_user():
    username = input("Enter your username: ")
    password = input("Enter your password: ")
    hashed_password = generate_password_hash(password, method='sha256')

    user = User(username=username, password_hash=hashed_password)
    db.session.add(user)
    db.session.commit()
    print(f"User {username} has been created!")

# CLI function for login
def login_user_cli():
    username = input("Enter your username: ")
    password = input("Enter your password: ")
    user = User.query.filter_by(username=username).first()

    if user and check_password_hash(user.password_hash, password):
        login_user(user)
        print(f"Logged in as {username}")
    else:
        print("Invalid credentials.")

# CLI function for saving an image
def save_image():
    if current_user.is_authenticated:
        volume = float(input("Enter the volume: "))
        image_file = input("Enter image file path: ")

        # Process image and save it
        if os.path.exists(image_file):
            filename = os.path.basename(image_file)
            image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            img = Image.open(image_file)
            img.save(image_path)

            # Save to database
            new_saved_point = SavedPoint(image_filename=filename, volume=volume, user_id=current_user.id)
            db.session.add(new_saved_point)
            db.session.commit()

            print(f"Image and volume saved for user {current_user.username}.")
        else:
            print("Image file not found.")
    else:
        print("You need to be logged in to save an image.")

# Route to display all save points for the current user
@app.route('/saved_points', methods=['GET'])
@login_required
def saved_points():
    points = SavedPoint.query.filter_by(user_id=current_user.id).all()
    return jsonify([{'image': point.image_filename, 'volume': point.volume, 'date': point.date_saved} for point in points])

# CLI function to handle user interactions
def cli():
    while True:
        print("\n1. Sign up\n2. Login\n3. Save Image\n4. View Saved Points\n5. Exit")
        choice = input("Choose an option: ")

        if choice == "1":
            signup_user()
        elif choice == "2":
            login_user_cli()
        elif choice == "3":
            save_image()
        elif choice == "4":
            if current_user.is_authenticated:
                print(saved_points())
            else:
                print("You need to be logged in to view saved points.")
        elif choice == "5":
            if current_user.is_authenticated:
                logout_user()
                print("Logged out.")
            break
        else:
            print("Invalid choice.")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    cli()
