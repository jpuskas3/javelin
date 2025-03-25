#!/bin/bash
directory=$(pwd)

echo "copying Desk folder to the desktop"
sudo cp -r Desk ../Desktop
echo "did it work?"
read

echo "entering Desk"
cd
cd Desktop/Desk
echo "making gitcloning.sh executable"
sudo chmod +x gitcloning.sh
echo "$directory: are we in the right place before we continue?"
read

echo "copying the start_javelin.sh start file to desktop"
sudo cp start_javelin.sh ../
echo "is start_javelin.sh on the desktop?" 
read

cd ..
echo "making executable javelin_start.sh located in 'home/$USER/Desktop'"
sudo chmod +x start_javelin.sh

# Navigate to the .config directory
cd
cd .config 

# Check if the autostart directory exists
if [ -d file_path="$Home/$USER/.config/autostart" ]; then
    echo "Here's the directory"
    file_path="$HOME/$USER/.config/autostart/JAVELIN.sh.desktop"
    if [[ -e "$file_path" ]]; then
      echo "and here's the file"
    else
      cd
      cd Desktop/Desk
      cp JAVELIN.sh.desktop ../../.config/autostart
    fi
else
    echo "Not here"
    
    # Search for an autostart file
    autostart_file=$(find . -type f -name "autostart")
    
    if [ -n "$autostart_file" ]; then
        echo "Here's the autostart file"
    else
        echo "Autostart file not here either"
    fi
fi

echo "making executable JAVELIN.sh.desktop located in 'home/$USER/.config/autostart'"
cd
cd .config/autostart
sudo chmod +x JAVELIN.sh.desktop
echo "Done with that. Ready to move on?"
read

echo "Now building the local(root) venv called javenv"
echo "building local venv"
cd
cd ..
cd ..
python3 -m venv javenv
source javenv/bin/activate
pip install -r javelin/requirements.txt
deactivate
echo "javenv installation completed"
read

echo "entering javelin directory"
cd
cd javelin

echo "making executable all javelin directory files"
sudo chmod +x mom.sh butler.sh intro.sh JAVELIN.sh asem
echo "+"
sleep 1
sudo chmod +x app_gui.py app.py toolbar_gui.py models.py
cd ..
echo "+"
sleep 1

echo "Checking/Editing .profile and for automated start lines..."
# define the line to add to .bash_profile
line_to_add='# Automatically open my app after login
~/Desktop/start_javelin.sh'
# Check if the line already exists in .bash_profile
if ! grep -Fxq "$line_to_add" ~/.bash_profile; then
  # If the line doesn't exist, append it to .bash_profile
  echo "$line_to_add" >> ~/.bash_profile
  echo "Line added to .bash_profile."
else
  echo "Line already exists."
fi

echo "if a file is moved, it maintains the owner's permissions, if it is copied new executable permissions must be re-established"
echo "That's all. This should work"
exit
