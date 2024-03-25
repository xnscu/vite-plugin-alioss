rm -rf .git
git init
git remote add origin git@github.com:xnscu/$(basename $PWD).git
git fetch
git reset --hard origin/master
git branch --set-upstream-to=origin/master master
