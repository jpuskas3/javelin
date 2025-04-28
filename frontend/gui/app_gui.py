import sys
import os
import subprocess
from PyQt5.QtWidgets import (
    QApplication, QWidget, QVBoxLayout, QLabel, QPushButton,
    QComboBox, QFileDialog
)

class AppManager(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("App Manager")
        self.setGeometry(520, 0, 500, 300)

        self.layout = QVBoxLayout()

        # Status label
        self.status_label = QLabel("Status: Idle")
        self.layout.addWidget(self.status_label)

        # Make an App button
        self.make_app_button = QPushButton("Make an App")
        self.make_app_button.clicked.connect(self.make_app)
        self.layout.addWidget(self.make_app_button)

        # Select an App dropdown
        self.app_selector_label = QLabel("Select an App:")
        self.app_selector = QComboBox()
        self.app_selector.addItem("Select an app")
        self.layout.addWidget(self.app_selector_label)
        self.layout.addWidget(self.app_selector)

        # Start App button
        self.start_app_button = QPushButton("Start App")
        self.start_app_button.clicked.connect(self.start_app)
        self.layout.addWidget(self.start_app_button)

        # Stop App button
        self.stop_app_button = QPushButton("Stop App")
        self.stop_app_button.clicked.connect(self.stop_app)
        self.layout.addWidget(self.stop_app_button)

        self.setLayout(self.layout)
        self.running_processes = {}

        # Populate the app selector on launch
        self.update_app_selector()

    def make_app(self):
        """Trigger a script to make an app."""
        # Here you can call a script or process to create a new app.
        script_path = "path/to/your/make_app_script.sh"  # Update with actual script path
        process = subprocess.Popen([script_path])
        process.communicate()
        
        # After the script runs, update the app selector
        self.update_app_selector()
        self.status_label.setText("App created successfully.")

    def update_app_selector(self):
        """Scan a directory to update available containerized apps and display their ports."""
        self.app_selector.clear()
        self.app_selector.addItem("Select an app")

        app_dir = "data/apps"  # You can change this path
        if not os.path.exists(app_dir):
            os.makedirs(app_dir)

        apps = [f for f in os.listdir(app_dir) if os.path.isdir(os.path.join(app_dir, f))]
        for app in apps:
            # Example: Simulating the fetching of app port, replace with your actual logic
            port = self.get_app_port(app)  # This could be dynamic based on your workflow
            self.app_selector.addItem(f"{app} - Port {port}")

    def get_app_port(self, app_name):
        """Simulate fetching the port of the app. Replace with actual logic."""
        # Replace this logic with how you track ports for each container
        return 5000  # Default port for now, or fetch dynamically

    def start_app(self):
        """Start the selected app (container)."""
        selected_app = self.app_selector.currentText()
        if selected_app == "Select an app":
            self.status_label.setText("Error: Please select an app to start.")
            return

        app_name = selected_app.split(' - ')[0]  # Extract app name from dropdown text
        try:
            port = self.get_app_port(app_name)
            process = subprocess.Popen(["docker", "start", app_name])
            self.running_processes[app_name] = process
            self.status_label.setText(f"{app_name} started on port {port}.")
        except Exception as e:
            self.status_label.setText(f"Error starting app: {e}")

    def stop_app(self):
        """Stop the selected app (container)."""
        selected_app = self.app_selector.currentText()
        if selected_app == "Select an app":
            self.status_label.setText("Error: Please select an app to stop.")
            return

        app_name = selected_app.split(' - ')[0]  # Extract app name from dropdown text
        try:
            subprocess.run(["docker", "stop", app_name])
            self.running_processes.pop(app_name, None)
            self.status_label.setText(f"{app_name} stopped.")
        except Exception as e:
            self.status_label.setText(f"Error stopping app: {e}")

def main():
    app = QApplication(sys.argv)
    window = AppManager()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
