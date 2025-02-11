#!/bin/bash

# 检查是否以root权限运行
if [ "$EUID" -ne 0 ]; then 
    echo "请使用root权限运行此脚本"
    exit 1
fi

# 脚本保存路径
SCRIPT_PATH="$HOME/lisk.sh"

# 检查并安装所需环境
function check_and_install_dependencies() {
    # 检查 git 是否安装
    if ! command -v git &> /dev/null; then
        echo "git 未安装，正在安装..."
        apt-get update && apt-get install -y git
    else
        echo "git 已安装"
    fi

    # 检查 node 是否安装
    if ! command -v node &> /dev/null; then
        echo "Node.js 未安装，正在安装..."
        curl -sL https://deb.nodesource.com/setup_14.x | bash -
        apt-get install -y nodejs
    else
        echo "Node.js 已安装"
    fi

    # 检查 npm 是否安装
    if ! command -v npm &> /dev/null; then
        echo "npm 未安装，正在安装..."
        apt-get install -y npm
    else
        echo "npm 已安装"
    fi
}

# 执行 Lisk 每日签到 的函数
function execute_lisk_signin() {
    # 克隆 GitHub 仓库
    git clone https://github.com/sdohuajia/Lisk-bot.git

    # 进入目录
    cd Lisk-bot

    # 安装依赖
    npm install

    # 让用户输入私钥
    read -p "请输入私钥（不带0x前缀）: " private_key

    # 将私钥写入 address.txt
    echo "$private_key" > address.txt

    # 让用户输入代理
    read -p "请输入代理（可填可不填，直接回车跳过）: " proxy

    # 如果用户输入了代理，则将其写入配置文件或进行相应处理
    if [ -n "$proxy" ]; then
        echo "代理已设置为: $proxy"
        # 这里可以添加将代理写入配置文件的代码
    else
        echo "未设置代理"
    fi

    # 使用 screen 启动 npm
    screen -dmS lisk npm start
    echo "Lisk 每日签到已在后台启动，使用 screen 会话名 'screen -r lisk'。"

    read -p "按任意键返回主菜单..."
}

# 主菜单函数
function main_menu() {
    while true; do
        clear
        echo "脚本由大赌社区哈哈哈哈编写，推特 @ferdie_jhovie，免费开源，请勿相信收费"
        echo "如有问题，可联系推特，仅此只有一个号"
        echo "================================================================"
        echo "退出脚本，请按键盘 ctrl + C 退出即可"
        echo "请选择要执行的操作:"
        echo "1. 执行 Lisk 每日签到"
        read -p "请输入选项: " option

        case $option in
            1)
                check_and_install_dependencies
                execute_lisk_signin
                ;;
            *)
                echo "无效选项，请重新选择。"
                ;;
        esac
    done
}

# 调用主菜单函数
main_menu
