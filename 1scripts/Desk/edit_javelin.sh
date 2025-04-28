#!/bin/bash
cd
source javenv/bin/activate
cd javelin

xterm -geometry 83x21+508+429 -e "bash -c 'source $HOME/javelin/intro.sh; exec bash'" &

python3 toolbar_gui.py &

python3 app_gui.py &

chromium --window-size=600,767 --window-position=1006,0 index.html
echo "OK"
read
echo "press enter again to close"
read
