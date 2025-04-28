#!/bin/bash

name=$1
age=$2
compliment=$3

echo "this is the git cloning/commit page"
echo "javelin will be erased and reinstalled from git unless committed"
echo ".................."
echo ".................."
echo "clone javelin(1) | commit to main (2) | clone javelin2 (3) | commit to test(4) | nevermind(x)?"
read opt
if [[ $opt == 1 ]]; then
        cd
        sudo rm -r javelin
        git clone https://github.com/jpuskas3/javelin.git
        cd javelin/1scripts
        sudo chmod +x deskinstall.sh
        ./deskinstall.sh $name $age $compliment
    elif [[ $opt == 2 ]]; then
        cd ..
        git checkout main
        git add .
        git commit -m "updated from local"
        git push https://github.com/jpuskas3/javelin.git main
echo "Merge a pull request (from the command line, typically after testing):
 To merge a pull request, you would fetch the pull request into your local repo and then merge it:
git fetch https://github.com/your-username/your-repo.git pull/<PR-number>/head:test
git checkout test
git merge test"
    elif [[ $opt == 3 ]]; then
        cd
        cd Desktop
        sudo rm -r javelin
        git clone --branch test https://github.com/jpuskas3/javelin.git
        cd
        cd javelin/1scripts
    elif [[ $opt == 4 ]]; then
        cd
        cd Desktop/javelin
        git checkout test
        git add .
        git commit -m "updated from local desktop"
        git push https://github.com/jpuskas3/javelin.git test
        cd
        cd javelin/1scripts
    else
        echo "./butler.sh $name $age $compliment"
fi

echo "anything else in gitcloning? (y/n)"
read opt

if [[ $opt == y ]]; then
        ./gitcloning.sh
    else
        echo "exiting gitcloning..."
        exit
fi
