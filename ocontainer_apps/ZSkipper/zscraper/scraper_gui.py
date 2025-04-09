import sys
import os
import requests
from PyQt5.QtCore import QThread, pyqtSignal
from PyQt5.QtWidgets import QApplication, QWidget, QVBoxLayout, QLineEdit, QSpinBox, QLabel, QPushButton, QFileDialog
from scraper import Scraper  # Import scraper class

class ScraperThread(QThread):
    status_signal = pyqtSignal(str)

    def __init__(self, scraper):
        super().__init__()
        self.scraper = scraper

    def run(self):
        self.status_signal.emit("Scraping started...")
        result = self.scraper.scrape()
        if "headlines" in result:
            self.status_signal.emit(f"Scraping finished successfully! Found {len(result['headlines'])} headlines.")
        else:
            self.status_signal.emit(f"Error: {result.get('error')}")

class ScraperGUI(QWidget):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("Web Scraper Control")
        self.setGeometry(1025, 460, 570, 300)

        self.layout = QVBoxLayout()

        self.status_label = QLabel("Status: Idle")
        self.layout.addWidget(self.status_label)

        self.url_label = QLabel("Enter URL:")
        self.url_input = QLineEdit()
        self.layout.addWidget(self.url_label)
        self.layout.addWidget(self.url_input)

        self.output_label = QLabel("Output File:")
        self.output_input = QLineEdit()
        self.layout.addWidget(self.output_label)
        self.layout.addWidget(self.output_input)

        self.browse_button = QPushButton("Browse...")
        self.browse_button.clicked.connect(self.browse_file)
        self.layout.addWidget(self.browse_button)

        self.interval_label = QLabel("Scraping Interval (seconds):")
        self.interval_input = QSpinBox()
        self.interval_input.setRange(1, 3600)
        self.layout.addWidget(self.interval_label)
        self.layout.addWidget(self.interval_input)

        self.start_button = QPushButton("Start Scraper")
        self.start_button.clicked.connect(self.start_scraper)
        self.layout.addWidget(self.start_button)

        self.stop_button = QPushButton("Stop Scraper")
        self.stop_button.clicked.connect(self.stop_scraper)
        self.layout.addWidget(self.stop_button)

        self.setLayout(self.layout)

        self.scraper_thread = None

    def start_scraper(self):
        url = self.url_input.text()
        output_file = self.output_input.text()

        if not url or not output_file:
            self.status_label.setText("Error: Please fill out all fields.")
            return

        scraper = Scraper(url, output_file)
        self.scraper_thread = ScraperThread(scraper)
        self.scraper_thread.status_signal.connect(self.update_status)
        self.scraper_thread.start()

    def stop_scraper(self):
        if self.scraper_thread:
            self.scraper_thread.terminate()
            self.status_label.setText("Status: Stopped")

    def update_status(self, message):
        self.status_label.setText(f"Status: {message}")

    def browse_file(self):
        file_dialog = QFileDialog()
        file_dialog.setDefaultSuffix("json")
        file_dialog.setAcceptMode(QFileDialog.AcceptMode.Save)
        file_dialog.setNameFilter("JSON files (*.json)")

        if file_dialog.exec():
            selected_file = file_dialog.selectedFiles()[0]
            self.output_input.setText(selected_file)

def main():
    app = QApplication(sys.argv)
    window = ScraperGUI()
    window.show()
    sys.exit(app.exec_())

if __name__ == "__main__":
    main()
