#!/bin/bash
cd
source javenv/bin/activate
cd javelin

# Build the Docker image
docker build -t flask-app .
# Run the container
docker run -v $(pwd)/static/uploads:/app/static/uploads -p 5000:5000 flask-app

konsole --qwindowgeometry 990x300 -e "./intro.sh" &
# Wait for konsole to start
sleep 1
# Use wmctrl to move the konsole window to the bottom-left corner
wmctrl -r "Konsole" -e 0,0,1000,990,300 &

python3 app_gui.py &


python3 --window-position=0,0 toolbar_gui.py &


chromium --window-size=600,450 --window-position=1010,0 templates/index.html

