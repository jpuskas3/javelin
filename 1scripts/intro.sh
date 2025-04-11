#!/bin/bash

name=$name
age=$age
compliment=$compliment

#listen for $name from recorded user framework on external file that manages the value of "global" variables for users
echo "$directory"
echo "what's your name?"
read name
if [[ $name == "john" ]]; then
	bday="4/24/1995"
 	age="almost 30"
	sleep 1
	echo "Oh it's you $name!"
	echo "Butler!"
	sleep 1
else
	echo "what's your birthday"
	read bday
 	echo "sorry how old does that make you?"
	read age
	echo "$name: $age"
	echo "Enjoy your visit!"
	sleep 1
	
fi
cd
cd javelin/1scripts
./butler.sh $name $age
