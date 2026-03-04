set global.ui_sync = 0

M291 P"Select failure reason:" R"Data Collection" S3 K{"Bad File","Bad Orient"}

if input == 0
    set global.ui_sync = 1 ; Unprintable/Bad File
elif input == 1
    set global.ui_sync = 2 ; Bad Orientation