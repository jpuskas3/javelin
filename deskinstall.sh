#!/bin/bash
directory=$(pwd)

echo "copying Desk folder to the desktop"
sudo cp -r Desk ../Desktop
echo "entering Desktop/Desk"
cd
cd Desktop/Desk
echo "making gitcloning.sh executable"
sudo chmod +x gitcloning.sh
echo "$directory"
echo "copying the edit_javelin.sh and start_javelin.sh file to desktop"
sudo cp edit_javelin.sh ../
sudo cp start_javelin.sh ../
echo "making executable edit_javelin.sh and start_javelin.sh located in 'home/$USER/Desktop'"
cd ..
sudo chmod +x edit_javelin.sh
sudo chmod +x start_javelin.sh
echo "are they BOTH on the desktop?"
read

# Navigate to the .config directory
cd
cd .config 

# Check if the autostart directory exists
if [ -d "autostart" ]; then
    echo "Here's the directory"
    file_path="$HOME/.config/autostart/JAVELIN.sh.desktop"
    if [[ -e "$file_path" ]]; then
      echo "It's already here"
    else
      cd
      cd Desktop/Desk
      sudo cp JAVELIN.sh.desktop ../../.config/autostart
    fi
else
    echo "Not here"
    
    # Search for an autostart file
    autostart_file=$(find . -type f -name "autostart")
    
    if [ -n "$autostart_file" ]; then
        echo "Here's the autostart file"
    else
        echo "Autostart file not here either. im in $pwd"
    fi
fi

echo "making executable JAVELIN.sh.desktop located in 'home/$USER/.config/autostart'"
cd
cd .config/autostart
sudo chmod +x JAVELIN.sh.desktop
echo "Done autostart config. Ready to move on?"
read

echo "Now building venv called javenv"
cd
python3 -m venv javenv
source javenv/bin/activate
pip install -r javelin/requirements.txt
deactivate
echo "javenv installation complete"
echo "entering javelin directory"
echo "making executable all javelin directory files"
cd
cd javelin
sudo chmod +x JAVELIN.sh mom.sh butler.sh intro.sh asem
echo "+"
sudo chmod +x app_gui.py app.py toolbar_gui.py models.py
echo "done"
echo "Building the Docker image"
docker build -t flask-app .
echo "Docker flask-app is built"
cd ..
echo "$directory"
echo "if a file is moved, it maintains the owner's permissions, if it is copied new executable permissions must be re-established"
echo "That's all. This should work"
exit
