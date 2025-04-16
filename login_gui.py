import sys
import os
import sqlite3
from PyQt5.QtWidgets import QApplication, QWidget, QLabel, QLineEdit, QPushButton, QVBoxLayout, QMessageBox
from PyQt5.QtCore import Qt

USER_DB_DIR = "4instance"
os.makedirs(USER_DB_DIR, exist_ok=True)

def get_user_db_path(username):
    return os.path.join(USER_DB_DIR, f"{username}.db")

def create_user_database(username, password):
    db_path = get_user_db_path(username)
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    ''')
    c.execute('INSERT INTO credentials (username, password) VALUES (?, ?)', (username, password))
    conn.commit()
    conn.close()

def user_exists(username):
    return os.path.isfile(get_user_db_path(username))

def validate_user(username, password):
    db_path = get_user_db_path(username)
    if not os.path.exists(db_path):
        return False
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('SELECT password FROM credentials WHERE username = ?', (username,))
    row = c.fetchone()
    conn.close()
    return row is not None and row[0] == password

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
            # TODO: Launch container + use 4instance/<username>.db
        else:
            QMessageBox.warning(self, "Error", "Invalid credentials.")

    def register(self):
        username = self.username_input.text().strip()
        password = self.password_input.text().strip()
        if not username or not password:
            QMessageBox.warning(self, "Error", "Please enter both username and password.")
            return
        if user_exists(username):
            QMessageBox.warning(self, "Error", "User already exists.")
        else:
            create_user_database(username, password)
            QMessageBox.information(self, "Success", "User registered!")

if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = LoginRegisterWindow()
    window.show()
    sys.exit(app.exec_())
