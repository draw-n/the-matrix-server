; Reset sync variable to 0 (Waiting)
set global.ui_sync = 0

; Prompt for Success
M291 P"Was the print successful?" R"Quality Check" S3 K{"YES","NO"}

if input == 0
    set global.ui_sync = 1 ; User chose YES
else
    set global.ui_sync = 2 ; User chose NO