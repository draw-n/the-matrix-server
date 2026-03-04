set global.ui_sync = 0

M291 P"Do you want to attempt a reprint?" R"Recovery" S3 K{"YES","NO"}

if input == 0
    set global.ui_sync = 1 ; YES - Go to Bed Clear
else
    set global.ui_sync = 2 ; NO - Go to Reason Selection