#!/bin/bash

name=$name
age=$age
compliment=$compliment

#listen for $name from recorded user framework on external file that manages the value of "global" variables for users
echo "who are you??"
read name
if [[ $name == "john" ]]; then
	age="29"
	sleep 1
	echo "Oh it's you $name!"
	echo "Butler!"
	sleep 1
	./butler.sh $name $age
else
	echo "How old are you?"
	read age
	sleep 1
	echo "$name: $age"
	sleep 1
	echo "Enjoy your visit!"
	sleep 1
	./butler.sh $name $age
fi
