#!/bin/bash

name=$1
age=$2
compliment=$3

echo "this is the git cloning/commit page"
echo "javelin will be erased and reinstalled from git"
echo "or this local javelin will be committed to the GitHub jpuskas3 javelin repository"
echo "clone(1) commit(2) or go back(x)?"
read opt
if [[ $opt == 1 ]]; then
        cd
        sudo rm -r javelin
        git clone https://github.com/jpuskas3/javelin.git
        cd javelin
        sudo chmod +x deskinstall.sh
        ./deskinstall.sh $name $age $compliment
        ./butler.sh $name $age $compliment

    elif [[ $opt == 2 ]]; then
        git add
        git commit

    else
        ./butler.sh $name $age $compliment
    fi
