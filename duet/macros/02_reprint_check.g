set global.ui_sync = 0

M291 P"Select YES if it's a setup error (ex. bad adhesion). Otherwise, select NO to mark this print as failed." R"Do you want to attempt a reprint?" S4 K{"YES","NO"} J1 T120

if input == 0
    set global.ui_sync = 1 ; YES - Go to Bed Clear
else
    set global.ui_sync = 2 ; NO - Go to Reason Selection