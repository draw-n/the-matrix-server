; Reset sync variable to 0 (Waiting)
set global.ui_sync = 0

; Prompt for Success
M291 P"If any parts fell or are missing, select NO." R"Was the print successful?" S4 K{"YES","NO"} J1 T120

if input == 0
    set global.ui_sync = 1 ; User chose YES
else
    set global.ui_sync = 2 ; User chose NO