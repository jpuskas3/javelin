#!/bin/bash

name=$1
age=$2
compliment=$3

echo "this is the git cloning/commit page"
echo "javelin will be erased and reinstalled from git unless committed"
echo ".................."
echo ".................."
echo "clone javelin(1) | commit to main (2) | clone javelin2 (3) | commit to test(4) | back(x)?"
read opt
if [[ $opt == 1 ]]; then
        cd
        sudo rm -r javelin
        git clone https://github.com/jpuskas3/javelin.git
        cd javelin/1scripts
        sudo chmod +x deskinstall.sh
        ./deskinstall.sh $name $age $compliment
        ./butler.sh $name $age $compliment

    elif [[ $opt == 2 ]]; then
        git add
        git commit

    elif [[ $opt == 3 ]]; then
        cd
        cd Desktop
        sudo rm -r javelin
        echo "how to clone from test branch?"
        echo "not doing it yet"
        read
# git clone https://github.com/jpuskas3/javelin.git
    
    elif [[ $opt == 4 ]]; then
        cd
        cd Desktop/javelin
        echo "how to commit to test vs main?"
        echo "not doing it yet"
        read
# git add
# git commit
    else
        ./butler.sh $name $age $compliment
    fi
