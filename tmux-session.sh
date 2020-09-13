#!/bin/bash

SESSIONNAME="notaza"
tmux has-session -t $SESSIONNAME &> /dev/null

if [ $? != 0 ]; then
    tmux new-session -s $SESSIONNAME -d
    tmux send-keys -t $SESSIONNAME "cd server" Enter "export CONTENT_DIRECTORY=/home/flammel/code/notaza-content" Enter
    tmux send-keys -t $SESSIONNAME "cd server" Enter "php -S localhost:8081" Enter
    tmux new-window -t $SESSIONNAME
    tmux send-keys -t $SESSIONNAME "cd client" Enter "npm run serve" Enter
    tmux new-window -t $SESSIONNAME
    tmux send-keys -t $SESSIONNAME "cd client" Enter
fi

tmux attach -t $SESSIONNAME
