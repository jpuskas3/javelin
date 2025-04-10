#!/bin/bash
name=$1
age=$2
user=$(whoami)
directory=$(pwd)
date=$(date)

echo "Butler: Hello $name!"
echo "$age years old, bday is coming up in this many days..."
echo "You're logged in as $user,"
echo "Directory: $directory"
echo "Date: $date"
echo ""
sleep 1
echo "$directory"
echo ""
echo "What to do?"
echo "Call Mom (1) | Edit asem.s file (2) | Compile, assemble, run asem (3)"
echo "Display frontend (4) | Edit javelin (5) | Run deskinstall.sh (6)"
echo "Upload javelin to USB 'Lexar' (7) | Git clone javelin locally (8) | Exit javelin (x)"
read opt
if [[ $opt == "1" ]]; then
		echo "Call Mom..." 
		sleep 1
		./mom.sh $name $age
	elif [[ $opt == "2" ]]; then
		cd assembly
  		vim asem.s
		cd ..
	elif [[ $opt == "3" ]]; then
		cd assembly
		as asem.s -o asem.o
		gcc -o asem asem.o -nostdlib -static
		sleep 1
		echo ""
		./asem
		echo ""
  		cd ..
		read
	elif [[ $opt == "4" ]]; then
		cd ..
    		echo "Open javelin web"
		echo "Open GUI's"
		python3 frontend/gui/app_gui.py & python3 frontend/gui/toolbar_gui.py & chromium -e index.html
		sleep 1
  		cd 1scripts
	elif [[ $opt == "5" ]]; then
		echo "Edit javelin..."
		cd ..
		sleep 1
  		python3 frontend/gui/app_gui.py & python3 frontend/gui/toolbar_gui.py & chromium -e "index.html" & konsole -e --qwindowgeometry 525x400+50+50 "nano 1scripts/JAVELIN.sh 1scripts/deskinstall.sh 1scripts/butler.sh 1scripts/mom.sh 1scripts/intro.sh frontend/gui/app_gui.py backend/app/app.py frontend/gui/toolbar_gui.py"
  		sleep 1
    		cd 1scripts
  		./deskinstall.sh
    		sleep 1
  		./butler.sh $name $age
	elif [[ $opt == "6" ]]; then
		./deskinstall.sh
		echo "ran deskinstall.sh"
		read
	elif [[ $opt == "7" ]]; then
		echo "Upload javelin to the USB 'Lexar'..."
		cd
		echo "arrived in home directory"
		sleep 1
		echo "copying javelin to usb"
		sudo cp -r javelin /run/media/$USER/Lexar
		echo "copied javelin directory to /run/media/$USER/Lexar"
		cd javelin/1scripts
	elif [[ $opt == "8" ]]; then
		./gitcloning.sh $name $age
	else
		echo "Closing Butler..."
		sleep 1
		exit
	fi

./butler.sh $name $age
