import sys
import subprocess
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QDesktopWidget
from PyQt5.QtCore import Qt

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.initUI()

    def initUI(self):
        self.setWindowTitle("Toolbar GUI")

# Set the window to always stay at the bottom of the screen
        screen_rect = QDesktopWidget().availableGeometry()
        self.setGeometry(0, 1500, screen_rect.width(), 100)
        self.setWindowFlags(Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint)
        
# Set up the window
#       self.setWindowTitle("Serving Tool")
#       self.setGeometry(510, 38, 500, 380)
        
# Layout
        layout = QVBoxLayout()

# Buttons
        self.serving_tool_button = QPushButton("Open Serving Tool", self)
        self.serving_tool_button.clicked.connect(self.open_serving_tool)

        self.web_scraper_button = QPushButton("Open Web Scraper Control", self)
        self.web_scraper_button.clicked.connect(self.open_web_scraper)

        self.close_button = QPushButton("Close", self)
        self.close_button.clicked.connect(self.close_application)

# Add buttons to layout
        layout.addWidget(self.serving_tool_button)
        layout.addWidget(self.web_scraper_button)
        layout.addWidget(self.close_button)

# Set layout
        self.setLayout(layout)

    def open_serving_tool(self):
        script_path = "/home/$USER/workstation/app_gui.py"
        subprocess.Popen(["python3", script_path])

    def open_web_scraper(self):
        script_path = "/home/$USER/workstation/scraper_gui.py"
        subprocess.Popen(["python3", script_path])

    def close_application(self):
        QApplication.quit()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_win = MainWindow()
    main_win.show()
    sys.exit(app.exec_())
