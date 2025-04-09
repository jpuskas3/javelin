#!/bin/bash
name=$1
age=$2
compliment=$3
echo "Calling $name's mom"
sleep 1
echo "Uh uh"
sleep 1
echo "Oh wow"
sleep 1
echo "no way"
cd templates
sleep 1
echo "Can you do me a favor?"
sleep 1
echo ""
echo "(1) Run javelin web w/ all HTML and CSS files in nano?"
echo "(2) Edit my Dash pages?"
echo "(3) Edit my Labs pages?"
echo "(4) Edit my Library pages?"
echo "(5) Edit my Mobile pages?"
echo "(6) Edit my Maps pages?"
echo "(any) Nevermind"
read opt
	
if [[ $opt == "1" ]]; then
	echo ""
	chromium index.html & konsole -e --qwindowgeometry 525x400+50+50 "nano dash_networks.html dash_office.html dash_profile.html dash_settings.html index.html lab_actions.html lab_outputs.html labs.html lib_actions.html lib_volumes.html library.html map_actions.html map_key.html map_overlays.html maps.html mobile.html mobile_config.html mobile_download.html project.html javelin.css javelin.html"
	echo ""
elif [[ $opt == "2" ]]; then
	echo ""
	konsole -e --qwindowgeometry 525x400+50+50 "nano dash_networks.html dash_office.html dash_profile.html dash_settings.html project.html javelin.html javelin.css"
	echo ""
elif [[ $opt == "3" ]]; then
	echo ""
	konsole -e --qwindowgeometry 525x400+50+50 "nano labs.html lab_outputs.html lab_actions.html project.html javelin.css"
	echo ""
elif [[ $opt == "4" ]]; then
	echo ""
	konsole -e --qwindowgeometry 525x400+50+50 "nano library.html lib_volumes.html lab_actions.html project.html javelin.css"
	echo ""
elif [[ $opt == "5" ]]; then
	echo ""
	konsole -e --qwindowgeometry 525x400+50+50 "nano mobile.html mobile_download.html mobile_config.html project.html javelin.css"
	echo "" 
elif [[ $opt == "6" ]]; then
	echo ""
	konsole -e --qwindowgeometry 525x400+50+50 "nano maps.html map_actions.html map_key.html map_overlays.html javelin.html javelin.css"
	echo ""
else
	echo "Something else? (y/n)"
	read opt
	if [[ $opt == "y" ]]; then
		./mom.sh $name $age $compliment
	else
		echo "No Thanks! Bye Mom"
		cd ..
		sleep 1
		./butler.sh $name $age $compliment
	fi
fi
cd ..
echo "Directory: $directory"
./butler.sh $name $age $compliment
