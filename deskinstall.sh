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
echo "copying the JAVELIN.sh start file to desktop"
sudo cp JAVELIN.sh ../

echo "making executable JAVELIN.sh located in 'home/$USER/Desktop'"
cd ..
sudo chmod +x JAVELIN.sh
echo "is JAVELIN.sh on the desktop? I'm about to build the venv"
echo "building local venv"
cd
cd
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
sudo chmod +x mom.sh butler.sh intro.sh asem
echo "+"
sleep 1
sudo chmod +x app_gui.py app.py toolbar_gui.py models.py
cd ..
echo "+"
sleep 1

echo "Checking/Editing .profile and for automated start lines..."
# define the line to add to .bash_profile
line_to_add='# Automatically open my app after login
~/Desktop/JAVELIN.sh'
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
