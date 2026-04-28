set global.ui_sync = 0

; S2 mode provides a single OK button
M291 P"Please select OK when the bed is clear and ready to print." R"A print is ready!" S2 J1 T120

set global.ui_sync = 1 ; User clicked OK