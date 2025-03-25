#!/bin/bash
# Navigate to home and activate virtual environment
cd ~
source javenv/bin/activate

# Navigate to the javelin directory
cd javelin

# Build the Docker image
docker build -t flask-app . | tee /dev/tty &

# Run the container (binding static file upload directory and exposing port 5000)
docker run -v \$(pwd)/static/uploads:/app/static/uploads -p 5000:5000 flask-app | tee /dev/tty &

# Wait for Docker to start (sleep for 2 seconds to give Docker some time)
sleep 2

# Run intro.sh in a separate window, but output goes to the root terminal
gnome-terminal -- bash -c 'source /home/$USER/javenv/bin/activate; bash /home/$USER/javelin/intro.sh; exec bash' &
tail -f /home/$USER/javelin/intro.sh | tee /dev/tty &

# Start the Flask app's server control GUI (app_gui.py) in a new window, but output goes to the root terminal
gnome-terminal -- bash -c 'source /home/$USER/javenv/bin/activate; python3 /home/$USER/javelin/app_gui.py; exec bash' &
tail -f /home/$USER/javelin/app_gui.py | tee /dev/tty &

# Start the toolbar GUI (toolbar_gui.py) in a new window, but output goes to the root terminal
gnome-terminal -- bash -c 'source /home/$USER/javenv/bin/activate; python3 /home/$USER/javelin/toolbar_gui.py; exec bash' &
tail -f /home/$USER/javelin/toolbar_gui.py | tee /dev/tty &

# Open Chromium with the specific window size and position, but output goes to the root terminal
gnome-terminal -- bash -c 'chromium --window-size=600,450 --window-position=1010,0 http://localhost:80; exec bash' &
tee /dev/tty

# Keep the root terminal open after executing all commands
exec bash
