set global.ui_sync = 0

M291 P"If it's another reason, please log the issue in the web app." R"Please select the most applicable failure reason." S4 K{"Bad File","Bad Orientation"}

if input == 0
    set global.ui_sync = 1 ; Unprintable/Bad File
elif input == 1
    set global.ui_sync = 2 ; Bad Orientation