SERVER_USER="ubuntu"
SERVER_ADDR="40.117.56.173"
SERVER_DIR="~/cancer-resnet-five"

echo "Copying latest server.js to server..."
rsync --progress server.js $SERVER_USER@$SERVER_ADDR:$SERVER_DIR/server.js

echo
echo
echo "Copying latest python script to server..."
rsync --progress model/predict.py $SERVER_USER@$SERVER_ADDR:$SERVER_DIR/model/predict.py

echo
echo
echo "Copying latest static folder to server..."
#rsync --progress -r  static $SERVER_USER@$SERVER_ADDR:$SERVER_DIR --exclude img/tmp

echo
echo
echo "Copying latest views to server..."
rsync --progress -r views $SERVER_USER@$SERVER_ADDR:$SERVER_DIR

echo
echo
echo "Copying latest package-lock.json to server..."
rsync --progress package-lock.json $SERVER_USER@$SERVER_ADDR:$SERVER_DIR/package-lock.json

echo
echo
echo "Completed!"
