import sys
import os
import json
import subprocess
from PyQt5.QtCore import QThread, pyqtSignal
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QLabel, QPushButton, QComboBox, QFileDialog

class ServingTool(QWidget):
    def __init__(self):
        super().__init__()

        # Set up the window
        self.setWindowTitle("Serving Tool")
        self.setGeometry(520, 0, 500, 380)

        # Layout for widgets
        self.layout = QVBoxLayout()

        # Status label
        self.status_label = QLabel("Status: Idle")
        self.layout.addWidget(self.status_label)

        # File selection dropdown for selecting JSON files
        self.file_label = QLabel("Select Data File:")
        self.file_selector = QComboBox()
        self.file_selector.addItem("Select a file")
        self.file_selector.currentIndexChanged.connect(self.update_data_objects)
        self.layout.addWidget(self.file_label)
        self.layout.addWidget(self.file_selector)

        # Data object selection dropdown
        self.data_object_label = QLabel("Select Data Object:")
        self.data_object_selector = QComboBox()
        self.layout.addWidget(self.data_object_label)
        self.layout.addWidget(self.data_object_selector)

        # Serve button
        self.serve_button = QPushButton("Serve Data")
        self.serve_button.clicked.connect(self.serve_data)
        self.layout.addWidget(self.serve_button)

        # Start Flask server button
        self.engage_button = QPushButton("Start Flask Server")
        self.engage_button.clicked.connect(self.start_flask)
        self.layout.addWidget(self.engage_button)

        # Stop Flask server button
        self.stop_flask_button = QPushButton("Stop Flask Server")
        self.stop_flask_button.clicked.connect(self.stop_flask)
        self.layout.addWidget(self.stop_flask_button)

        # Set layout for the window
        self.setLayout(self.layout)

        # Flask server subprocess variable
        self.flask_process = None

    def update_file_selector(self):
        """Update file selector with available JSON files in the 'data' folder."""
        self.file_selector.clear()
        self.file_selector.addItem("Select a file")

        # Get all JSON files in the 'data' folder
        data_files = [f for f in os.listdir('data') if f.endswith('.json')]

        for file in data_files:
            self.file_selector.addItem(file)

    def update_data_objects(self):
        """Update the data object dropdown based on selected file."""
        self.data_object_selector.clear()

        selected_file = self.file_selector.currentText()
        if selected_file != "Select a file":
            try:
                with open(f"data/{selected_file}", "r") as f:
                    data = json.load(f)
                    # Assuming data has a 'headlines' key with an array of headlines
                    if 'headlines' in data:
                        self.data_object_selector.addItem("Select Data Object")
                        for headline in data['headlines']:
                            self.data_object_selector.addItem(headline)
                    else:
                        self.status_label.setText("Error: Invalid file format")
            except Exception as e:
                self.status_label.setText(f"Error loading file: {e}")

    def serve_data(self):
        """Send selected data to app.py to serve."""
        selected_file = self.file_selector.currentText()
        selected_object = self.data_object_selector.currentText()

        if selected_file == "Select a file" or selected_object == "Select Data Object":
            self.status_label.setText("Error: Please select both file and data object.")
            return

        try:
            # Trigger app.py to serve the selected file and data object
            self.status_label.setText(f"Serving {selected_object} from {selected_file}...")
            response = subprocess.Popen(['python3', 'app.py', selected_file, selected_object])
            response.communicate()
        except Exception as e:
            self.status_label.setText(f"Error: {e}")

    def start_flask(self):
        """Start Flask server in the background."""
        if self.flask_process is None:
            try:
                # Start the Flask app (app.py) as a subprocess
                self.flask_process = subprocess.Popen(['python3', 'app.py'])
                self.status_label.setText("Flask server started.")
            except Exception as e:
                self.status_label.setText(f"Error starting Flask server: {e}")

    def stop_flask(self):
        """Stop Flask server."""
        if self.flask_process is not None:
            try:
                self.flask_process.terminate()  # Gracefully terminate the Flask server
                self.flask_process = None
                self.status_label.setText("Flask server stopped.")
            except Exception as e:
                self.status_label.setText(f"Error stopping Flask server: {e}")
        else:
            self.status_label.setText("Flask server is not running.")

def main():
    """Initialize and run the PyQt application."""
    app = QApplication(sys.argv)
    window = ServingTool()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
