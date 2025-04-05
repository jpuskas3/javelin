#!/bin/bash
cd
source javenv/bin/activate
cd javelin

# Check if container exists
if [[ $(docker ps -aq -f name=flask-app) ]]; then
    echo "Starting existing container..."
    docker start -a flask-app
else
    echo "Creating new container..."
    docker run -d --name flask-app -p 80:80 -p 5000:5000 flask-app
fi

xterm -geometry 83x21+508+429 -e "bash -c 'source $HOME/javelin/intro.sh; exec bash'" &

sleep 1  # Wait for the Konsole window to initialize

python3 toolbar_gui.py &

python3 app_gui.py &

chromium --window-size=600,767 --window-position=1006,0 http://localhost:80
echo "press enter to continue"
read
echo "OK"
echo "Still here? press enter to stop container and close app"
read
docker stop flask-app
