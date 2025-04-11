#!/bin/bash
directory=$(pwd)
sudo chmod +x JAVELIN.sh gitcloning.sh mom.sh butler.sh intro.sh assembly/asem
echo "copying Desk folder to the desktop"
sudo cp -r Desk ../../Desktop
echo "entering Desktop/Desk"
cd
cd Desktop/Desk
echo "copying the edit_javelin.sh delete_javelin.sh and start_javelin.sh files to desktop"
sudo cp edit_javelin.sh ../
sudo cp start_javelin.sh ../
sudo cp delete_javelin.sh ../
echo "making executable edit_javelin.sh and start_javelin.sh located in 'home/$USER/Desktop'"
cd ..
sudo chmod +x edit_javelin.sh
sudo chmod +x start_javelin.sh
sudo chmod +x delete_javelin.sh
echo "are ALL 3 on the desktop?"
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
      cd javelin/1scripts
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
echo "Done autostart config"
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
sudo chmod +x write_structure.sh login_gui.py
cd frontend
cp -r ../templates ../index.html ../javelin.css static
cp -r static ../backend/app

cd ../2data
echo "1"

cd ../3docker
echo "2"

cd ../4instance
echo "3"

cd ../backend/app
sudo chmod +x __init__.py app.py models.py
cd ..
echo "4"

cd ../frontend/static
cp -r templates index.html
cd ../gui
sudo chmod +x app_gui.py app.py toolbar_gui.py
cd static_resources
cd ..
cd ..
echo "5"

cd ../ocontainer
echo "6"

cd ../shared
echo "7"
echo "Completed Executables"

cd ..
echo "$directory"
echo "Building the Docker image"
docker build -f 3docker/Dockerfile -t flask-app .
echo "Done"

echo "if a file is moved, it maintains the owner's permissions, if it is copied new executable permissions must be re-established"
echo "That's all. This should work"
exit
