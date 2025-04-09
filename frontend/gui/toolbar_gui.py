import sys
import subprocess
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QPushButton, QDesktopWidget
from PyQt5.QtCore import Qt, QPoint

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.all_minimized = False
        self.all_maximized = False
        self.initUI()
        self.old_pos = self.pos()

    def initUI(self):
        self.setWindowTitle("Toolbar")

        # Reduce height for a more compact UI
        self.resize(200, 65)  # Reduced height

        # Position in bottom-right corner
        screen_rect = QDesktopWidget().availableGeometry()
        self.move(screen_rect.width() - self.width() - 0, screen_rect.height() - self.height() - 10)

        # Standard window controls and always on top
        self.setWindowFlags(Qt.WindowStaysOnTopHint)

        # Layout
        layout = QVBoxLayout()
        layout.setSpacing(2)  # Reduce spacing for compactness

        # Open Button (Restore)
        self.open_button = QPushButton("Open", self)
        self.open_button.clicked.connect(self.toggle_maximize)

        # Minimize Button
        self.minimize_button = QPushButton("Minimize", self)
        self.minimize_button.clicked.connect(self.toggle_minimize)

        # Close Button
        self.close_button = QPushButton("Close", self)
        self.close_button.clicked.connect(self.close_windows)

        # Add buttons
        layout.addWidget(self.open_button)
        layout.addWidget(self.minimize_button)
        layout.addWidget(self.close_button)

        self.setLayout(layout)

    def toggle_minimize(self):
        """Minimize only xterm and Serving Tool."""
        window_names = ['Serving Tool', 'intro.sh; exec bash']
        for name in window_names:
            try:
                output = subprocess.check_output(f"xdotool search --name \"{name}\"", shell=True).decode().strip()
                for wid in output.splitlines():
                    subprocess.run(f"xdotool windowminimize {wid}", shell=True)
            except subprocess.CalledProcessError:
                print(f"[Minimize] Window not found: {name}")

        self.minimize_button.setStyleSheet("background-color: green")
        self.open_button.setStyleSheet("")
        self.all_minimized = True
        self.all_maximized = False

    def toggle_maximize(self):
        """Restore xterm and Serving Tool windows or relaunch if closed."""
        # Serving Tool
        if subprocess.run("pgrep -f app_gui.py", shell=True).returncode != 0:
            subprocess.Popen(["xterm", "-T", "Serving Tool", "-e", "python3 app_gui.py"])
        else:
            subprocess.run("xdotool search --name 'Serving Tool' windowmap", shell=True)

        # intro.sh terminal
        if subprocess.run("xdotool search --name 'intro.sh; exec bash'", shell=True).returncode != 0:
            subprocess.Popen(["xterm", "-T", "intro.sh; exec bash", "-e", "./intro.sh"])
        else:
            subprocess.run("xdotool search --name 'intro.sh; exec bash' windowmap", shell=True)

        self.open_button.setStyleSheet("background-color: green")
        self.minimize_button.setStyleSheet("")
        self.all_maximized = True
        self.all_minimized = False

    def close_windows(self):
        """Close Serving Tool and intro.sh xterm, but keep toolbar open."""
        subprocess.run("pkill -f 'intro.sh; exec bash'", shell=True)
        subprocess.run("pkill -f 'app_gui.py'", shell=True)

    # Enable dragging
    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.old_pos = event.globalPos()

    def mouseMoveEvent(self, event):
        if event.buttons() & Qt.LeftButton:
            delta = QPoint(event.globalPos() - self.old_pos)
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.old_pos = event.globalPos()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_win = MainWindow()
    main_win.show()
    sys.exit(app.exec_())
