#!/bin/bash

# 获取当前目录的名称，它将被用作仓库的名称
REPO_NAME=$(basename "$(pwd)")
SCOPE=${1:-private}

# 检查gh是否已安装
if ! command -v gh &> /dev/null; then
    echo "GitHub CLI (gh) could not be found, please install it first."
    exit 1
fi

# 检查是否已经登录到GitHub
if ! gh auth status &> /dev/null; then
    echo "You are not logged into GitHub CLI (gh), please login first."
    exit 1
fi

rm -rf .git

git init

# 使用当前目录名创建新的GitHub仓库
gh repo create "xnscu/$REPO_NAME" --$SCOPE --source=. --remote=origin


# 添加所有文件到git
git add .

# 提交更改
git commit -m 'init by gh'

# 将提交推送到新创建的GitHub仓库
git push -u origin master

echo "Repository 'xnscu/$REPO_NAME' created and all files pushed to GitHub."
