import sys
import os
from PyQt5.QtWidgets import (
    QApplication, QWidget, QLabel, QLineEdit, QPushButton, QVBoxLayout, QMessageBox
)
from PyQt5.QtCore import Qt

USER_DIR = "data/user_accounts"
os.makedirs(USER_DIR, exist_ok=True)

def get_user_file_path(username):
    return os.path.join(USER_DIR, f"{username}.txt")

def user_exists(username):
    return os.path.isfile(get_user_file_path(username))

def save_user(username, password):
    with open(get_user_file_path(username), "w") as f:
        f.write(password)

def validate_user(username, password):
    try:
        with open(get_user_file_path(username), "r") as f:
            return f.read().strip() == password
    except FileNotFoundError:
        return False

class LoginRegisterWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("JAVELIN Login")
        self.setFixedSize(300, 200)
        self.setWindowFlags(Qt.WindowStaysOnTopHint)

        self.username_input = QLineEdit()
        self.username_input.setPlaceholderText("Username")

        self.password_input = QLineEdit()
        self.password_input.setPlaceholderText("Password")
        self.password_input.setEchoMode(QLineEdit.Password)

        self.login_button = QPushButton("Login")
        self.register_button = QPushButton("Register")

        self.login_button.clicked.connect(self.login)
        self.register_button.clicked.connect(self.register)

        layout = QVBoxLayout()
        layout.addWidget(QLabel("JAVELIN User Access"))
        layout.addWidget(self.username_input)
        layout.addWidget(self.password_input)
        layout.addWidget(self.login_button)
        layout.addWidget(self.register_button)
        self.setLayout(layout)

    def login(self):
        username = self.username_input.text().strip()
        password = self.password_input.text().strip()
        if validate_user(username, password):
            QMessageBox.information(self, "Success", "Login successful!")
            self.close()
            # TODO: Launch Docker container and main Flask app
        else:
            QMessageBox.warning(self, "Error", "Invalid credentials.")

    def register(self):
        username = self.username_input.text().strip()
        password = self.password_input.text().strip()
        if user_exists(username):
            QMessageBox.warning(self, "Error", "User already exists.")
        elif username and password:
            save_user(username, password)
            QMessageBox.information(self, "Success", "User registered!")
        else:
            QMessageBox.warning(self, "Error", "Please enter username and password.")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = LoginRegisterWindow()
    window.show()
    sys.exit(app.exec_())
