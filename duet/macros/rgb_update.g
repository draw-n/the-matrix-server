;placeholder config 
M950 E0 C"spi.cs1" T0

if state.status == "idle"
    M150 R0 U255 B0 P255 F1
else
    M150 R255 U0 B0 P255 F1
