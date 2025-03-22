#!/bin/bash
name=$1
age=$2
user=$(whoami)
directory=$(pwd)
date=$(date)

echo "Butler: Hello $name!"
echo "$age years old"
echo ""
sleep 1
echo "How we feeling today?!"
echo ""
sleep 1
echo "You're logged in as $user,"
echo "Directory: $directory"
echo "Date: $date"
echo ""
sleep 1
echo "$directory"
echo ""
echo "What to do?"
echo "Call Mom (1) | Edit asem.s file (2) | Compile, assemble, run asem (3)"
echo "Run javelin (4) | Edit javelin (5) | run deskinstall.sh (6)"
echo "Upload javelin to USB 'Lexar' (7) | Git clone javelin locally (8) | Exit javelin (x)"
read opt
if [[ $opt == "1" ]]; then
		echo "Call Mom..." 
		sleep 1
		./mom.sh $name $age

	elif [[ $opt == "2" ]]; then
		vim asem.s

	elif [[ $opt == "3" ]]; then
		sleep 1
		as asem.s -o asem.o
		gcc -o asem asem.o -nostdlib -static
		sleep 1
		echo ""
		./asem
		echo ""
		read

	elif [[ $opt == "4" ]]; then
		echo "Open javelin web"
		echo "Open GUI's"
		python3 app_gui.py & python3 toolbar_gui.py & chromium -e templates/index.html
		
	elif [[ $opt == "5" ]]; then
		echo "Edit javelin..."
		sleep 1
		python3 app_gui.py & python3 toolbar_gui.py & chromium -e "templates/index.html" & konsole -e --qwindowgeometry 525x400+50+50 "nano Desk/JAVELIN.sh deskinstall.sh butler.sh mom.sh intro.sh app_gui.py app.py toolbar_gui.py"
		./butler.sh $name $age

	elif [[ $opt == "6" ]]; then
		./deskinstall.sh
		echo "ran deskinstall.sh"
		read

	elif [[ $opt == "7" ]]; then
		echo "Upload javelin to USB named Lexar..."
		sleep 1
		cd
		echo "arrived in home directory"
		sleep 1
		echo "copying javelin to usb"
		sudo cp -r javelin /run/media/$USER/Lexar
		echo "copied javelin directory to /run/media/$USER/Lexar"
		cd javelin

	elif [[ $opt == "8" ]]; then
		cd
		cd Desktop/Desk
		./gitcloning.sh $name $age

	else
		echo "Close Butler..."
		sleep 1
		exit
	fi


./butler.sh $name $age
