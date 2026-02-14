#!/bin/bash

set -e

REPO_URL="https://github.com/supermerill/SuperSlicer.git"
TARGET_DIR="$(dirname "$0")/slicer-cli"
SRC_DIR="$TARGET_DIR/SuperSlicer"
BINARY_NAME="superslicer"


echo "[SuperSlicer Installer] Target directory: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

# Remove existing SuperSlicer binary if it exists
if [ -f "$TARGET_DIR/$BINARY_NAME" ]; then
	echo "[SuperSlicer Installer] Removing existing $BINARY_NAME binary..."
	rm -f "$TARGET_DIR/$BINARY_NAME"
fi

if [ -d "$SRC_DIR/.git" ]; then
	echo "[SuperSlicer Installer] Repo exists, pulling latest..."
	git -C "$SRC_DIR" pull
else
	echo "[SuperSlicer Installer] Cloning repo..."
	git clone "$REPO_URL" "$SRC_DIR"
fi

cd "$SRC_DIR"
echo "[SuperSlicer Installer] Building SuperSlicer..."
mkdir -p build
cd build
cmake .. -DSLIC3R_FHS=1 -DSLIC3R_GUI=0 -DSLIC3R_STATIC=1
make -j$(nproc)

# Find the built binary (may be in bin/ or .)
if [ -f "bin/$BINARY_NAME" ]; then
	cp "bin/$BINARY_NAME" "$TARGET_DIR/$BINARY_NAME"
elif [ -f "$BINARY_NAME" ]; then
	cp "$BINARY_NAME" "$TARGET_DIR/$BINARY_NAME"
else
	echo "[SuperSlicer Installer] Build failed: binary not found!"
	exit 1
fi

echo "[SuperSlicer Installer] Done. superslicer binary is in $TARGET_DIR/$BINARY_NAME."
