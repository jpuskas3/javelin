#!/bin/bash
cd
source javenv/bin/activate
cd javelin

# Stop and remove existing container if it exists
if [[ $(docker ps -aq -f name=flask-app) ]]; then
    echo "Stopping existing container..."
    docker stop flask-app
    docker rm flask-app
fi

echo "Building and starting a new container..."
docker build -t flask-app .
docker run -d --name flask-app -p 80:80 -p 5000:5000 flask-app

xterm -geometry 83x21+518+419 -e "bash -c 'source $HOME/javelin/intro.sh; exec bash'" &

sleep 1  # Wait for the Konsole window to initialize

python3 toolbar_gui.py &

python3 app_gui.py &

# Launch the application
chromium --window-size=600,767 --window-position=1015,-10 http://localhost:80 &
echo "press enter to continue"
read
echo "OK"
echo "Still here? press enter to stop container and close app"
read
docker stop flask-app





