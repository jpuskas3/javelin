# Javelin Project

Javelin is a modular, containerized application system built with Python, Flask, and PyQt. It integrates various containerized apps for managing data, user authentication, and providing a user-friendly interface via both a web frontend and a PyQt GUI. The project is designed for scalability and ease of use, with a focus on seamless integration between backend services, containers, and frontend interfaces.

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Directory Structure](#directory-structure)
- [Scripts Overview](#scripts-overview)
- [Requirements](#requirements)
- [License](#license)

## Project Overview

Javelin combines Flask, Docker, and PyQt to offer a modular platform for managing different applications and services. It provides:

- A web interface to interact with backend services and modular containers.
- A PyQt GUI for user authentication and managing app interactions.
- A modular container system that allows for easily integrating new applications.
- Persistent data storage for user accounts, logs, and caches.
- A Dockerized environment for easy deployment and scalability.

## Features

- User authentication via a PyQt GUI and web interface.
- Multiple backend services running in Docker containers.
- Modular containerized applications for different tasks (DeckBoss, ZSkipper, DataFarm, etc.).
- Persistent data storage with logs, cache, and user accounts.
- Customizable templates for web rendering (HTML pages for dashboard, media management, maps, etc.).
- Scalable architecture for adding new services and apps.

## Installation

To install Javelin, follow these steps:

1. Clone the repository:

    ```bash
    git clone https://github.com/yourusername/javelin.git
    cd javelin
    ```

2. Set up the Python virtual environment:

    ```bash
    python3 -m venv javenv
    source javenv/bin/activate
    ```

3. Install the dependencies:

    ```bash
    pip install -r requirements.txt
    ```

4. Build the Docker containers:

    ```bash
    docker-compose up --build
    ```

5. Run the app:

    ```bash
    ./1scripts/intro.sh
    ```

## Usage

Once installed, you can use Javelin to manage different services, access user data, and interact with modular applications through the web interface or PyQt GUI.

- Launch the PyQt GUI by running:

    ```bash
    python frontend/gui/app_gui.py
    ```

- Access the web interface via your browser at [http://localhost:80](http://localhost:80).

## Directory Structure

The project is organized into the following structure:

/javelin/
│
├── 1scripts/              # Setup, startup, and utility scripts
│   ├── intro.sh           # Introductory script to initialize or explain the app
│   ├── JAVELIN.sh         # Main script to launch the app and related processes
│   ├── deskinstall.sh     # Script for uninstalling the app or cleaning up
│   ├── Desk/              # Desktop-related scripts (e.g., start, delete, edit)
│   ├── mom.sh             # Script to manage and edit the project
│   ├── butler.sh          # Utility or helper script
│   ├── assembly/          # Assembly scripts related to app setup
├── 2data/                 # Persistent data (user accounts, logs, cache)
│   ├── logs/              # Log files
│   ├── cache/             # Cached data
│   ├── user_accounts/     # User account information
├── 3docker/               # Docker configuration files
│   ├── nginx.conf         # Nginx configuration
│   ├── Dockerfile         # Docker build configuration
├── 4instance/             # Instance-specific files such as databases (e.g., users.db)
│   ├── users.db           # Database for managing user data
├── backend/               # Flask app and backend services
│   ├── app/               # Main app files
│   │   ├── app.py         # Flask app entry point
│   │   ├── models.py      # Database models
│   │   ├── __init__.py    # App initialization
├── frontend/              # Web interface and GUI components
│   ├── static/            # Static files (CSS, images, etc.)
│   │   ├── javelin.css    # Global styles for the frontend
│   │   ├── index.html     # HTML file for frontend display
│   │   ├── templates/     # Template files for rendering in the web interface same files as the directly-stored "templates" folder
│   ├── gui/               # PyQt GUI components
│   │   ├── toolbar_gui.py # Toolbar GUI for managing app interactions
│   │   ├── app_gui.py     # Main login and dashboard GUI
│   │   ├── static_resources/  # Static resources for the GUI (e.g., icons, CSS)
│   ├── login_gui.py       # PyQt-based login GUI
├── ocontainer/            # Modular containerized applications (DeckBoss, ZSkipper, etc.)
│   ├── DeckBoss/          # Container for DeckBoss app
│   ├── ZSkipper/          # Container for ZSkipper app
│   ├── DataFarm/          # Container for DataFarm app
│   ├── Captain/           # Container for Captain app
│   ├── Maps/              # Container for Maps app
│   ├── Media/             # Container for Media app
│   ├── Library/           # Container for Library app
│   ├── OpenContainer/     # Base container for other modular apps
├── shared/                # Logs, cache, and shared data
│   ├── logs/              # Shared log files
│   ├── data/              # Shared data files
│   ├── cache/             # Shared cached data
├── templates/             # HTML templates for rendering in the web interface
│   ├── index.html         # Main index page template│   
│   ├── javelin.css        # Template-specific CSS file
│   ├── project.html       # Project overview page template
│   ├── dashboard.html
│   ├── dash_settings.html # Dashboard settings page template
│   ├── dash_profile.html  # User profile page template
│   ├── dash_office.html   # Dashboard office page template
│   ├── labs.html          # Labs overview page template
│   ├── lab_build.html     # Lab building page template
│   ├── lab_outputs.html   # Lab outputs page template
│   ├── lab_containers.html # Lab containers page template
│   ├── library.html       # Library page template
│   ├── lib_actions.html   # Library actions page template
│   ├── lib_volumes.html   # Library volumes page template
│   ├── maps.html          # Map page template
│   ├── map_overlays.html  # Map overlays page template
│   ├── map_key.html       # Map key page template
│   ├── media.html         # Media page template
│   ├── media_sources.html # Media sources page template
│   ├── media_options.html # Media options page template
│   ├── networks.html      # Networks page template
│   ├── settings.html
├── index.html             # Frontend HTML file for serving GitHub Pages testing
├── javelin.css            # Global styling for the project
├── login_gui.py           # Main PyQt login interface for the app
├── requirements.txt       # Python dependencies file
├── write_structure.sh     # Script to generate a project structure overview (project_structure.txt)

## Scripts Overview

- **intro.sh**: This script is used to introduce and initialize the application, providing basic instructions or configuration.
- **JAVELIN.sh**: This is the main script responsible for launching the app, including initializing Docker containers and setting up the backend services.
- **deskinstall.sh**: Use this script to uninstall the app or clean up the environment.
- **mom.sh**: A utility script to manage and edit the project’s configuration and components.
- **butler.sh**: A helper script for miscellaneous tasks related to the application.

## Requirements

- Python 3.x
- Docker
- Docker Compose
- PyQt5
- Flask
- A modern browser for the web interface

## License

Distributed under the MIT License. See LICENSE for more information.

