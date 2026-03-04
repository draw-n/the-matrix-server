set global.ui_sync = 0

; S2 mode provides a single OK button
M291 P"Please clear the bed and confirm." R"Logistics" S2

set global.ui_sync = 1 ; User clicked OK