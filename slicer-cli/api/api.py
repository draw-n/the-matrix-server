from flask import Flask
import subprocess
import os
import sizing
import configuration
import json
import requests
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

input_dir_path = ""
output_dir_path = ""
viewing_dir_path = ""
printer_ip = ""

def preCheck(filename, file_path):
    # check if it's an stl file
    if not checkSTL(filename):
        print("Invalid file format", 400)
        return False

    # check if the file_path is valid
    
    if not os.path.exists(file_path):
        print(f"File {file_path} does not exist", 404)
        return False
    
    return True


# Check if the file ends with .stl
def checkSTL(file):
    if file.endswith(".stl"):
        return True
    return False

# Reorient the part
def tweak(file_path):
    if file_path.endswith('_tweaked.stl'):
        print("File already tweaked, skipping")
        return file_path
    path = configuration.get_dir() + "/Tweaker-3/Tweaker.py"
    print(path)
    # prepare the command to be executed
    sub = [
    "python3",
    configuration.get_dir() + "/Tweaker-3/Tweaker.py",
    "-i",
    file_path,
    "-vb"
    ]

    print("Executing:", sub)

    # call the Tweaker.py script
    result = subprocess.run(
        sub,
        capture_output=True,
        text=True
    )
    print("Orientated part")
    
    output = result.stdout.split("\n")
    print(output)
    # return the new file path
    return file_path.replace(".stl", "_tweaked.stl")

def moveToOutput(file_path):
    # move the file to the output directory
    result = subprocess.run(
        [
            "mv",
            file_path,
            output_dir_path
        ],
        capture_output=True,
        text=True
    )
    print("Moved file to output directory")
    return result

def sendToPrinter(filename):
    response = requests.get(url=f"http://{printer_ip}/rr_connect?password=")
    if response.status_code == 200:
        upload = requests.post(url=f"http://{printer_ip}/rr_upload", params={"name": f"/gcodes/{filename}"}, data=open(f"{output_dir_path}/{filename}").read())
        if upload.status_code == 200:
            load = requests.get(url=f"http://{printer_ip}/rr_gcode", params={"gcode": f"M23 {filename}"})
            if load.status_code == 200:
                send = requests.get(url=f"http://{printer_ip}/rr_gcode", params={"gcode": "M24"})
                print(send.status_code)
                return True
    
    return False
    

def cleanup():
    # remove all files from the input directory, viewer, and maybe output
    return

@app.route('/viewer/<filename>')
def moveToViewer(filename):
    print(filename)
    file_path = input_dir_path + f"/{filename}"

    if not preCheck(filename, file_path):
        return "Failed precheck 1"
    
    file_path = tweak(file_path)

    target_path = viewing_dir_path + "/model.stl"

    result = subprocess.run(
        [
            "cp",
            file_path,
            target_path
        ],
        capture_output=True,
        text=True
    )

    if result.returncode != 0:
        print("Error copying file:", result.stderr)
        return "Copy failed"

    print("Copied and renamed file to viewer directory as model.stl")
    return "Success" 


@app.route('/test')
def test():
    return "Hello, World!"


# Call to get the size of the model
@app.route('/size/<filename>')
def size(filename):
    file_path = input_dir_path + f"/{filename}"
    
    if not preCheck(filename, file_path):
        return "Failed precheck 2"

    # Pass the full file_path to tweak and update file_path with its return value.
    file_path = tweak(file_path)

    print(file_path)

    # Now get the size from sizing.py
    result = sizing.getSize(file_path)

    return result


# Just a very basic slicing call, no orienting
@app.route('/file/<filename>')
def file(filename):
    file_path = input_dir_path + f"/{filename}"
    
    if not preCheck(filename, file_path):
        return "Failed precheck 3"
    
    result = subprocess.run(
        [
            configuration.get_dir() + f"/superslicer/superslicer",
            "-g",
            file_path
        ],
        capture_output=True,
        text=True
    )
    output = result.stdout.split("\n")
    error = result.stderr

    gcode_file = file_path.replace(".stl", ".gcode")
    moveToOutput(gcode_file)

    sendToPrinter(filename.replace(".stl", ".gcode"))
    return "Success"
    

# This call orients the part and allows for parameters
@app.route('/fileOptions/<file>/<options>')
def fileAndOption(file, options):
    file_path = input_dir_path + f"/{file}"
    
    if not preCheck(file, file_path):
        return "Failed precheck 4"

    file_path = tweak(file_path)

    # prepare superslicer command
    options_list = options.split()  
    print(options_list)
    sub = [
        configuration.get_dir() + f"/superslicer/superslicer", 
        "-g",
        file_path
    ] + options_list

    print("Executing:", sub)
    
    result = subprocess.run(
        sub,
        capture_output=True,
        text=True
    )
    
    output = result.stdout.split("\n")
    error = result.stderr

    gcode_file = file_path.replace(".stl", ".gcode")
    moveToOutput(gcode_file)
    sendToPrinter(file.replace(".stl", ".gcode"))
    return "Success"


@app.route('/materialPrint/<material>/<file>')
def baseMaterialPrint(material, file):
    file_path = input_dir_path + f"/{file}"
    
    if not preCheck(file, file_path):
        return "Failed precheck 5"
    
    material_file = configuration.get_dir() + "/configurations/" + material + "_config.ini"
    print(material_file)

    # get the part oriented and update the file_path to have the oriented part
    file_path = tweak(file_path)

    # prepare superslicer command
    sub = [
        configuration.get_dir() + f"/superslicer/superslicer", 
        "-g",
        file_path,
        "--load",
        material_file,
    ]

    print("Executing:", sub)
    
    result = subprocess.run(
        sub,
        capture_output=True,
        text=True
    )
    
    output = result.stdout.split("\n")
    error = result.stderr

    gcode_file = file_path.replace(".stl", ".gcode")
    moveToOutput(gcode_file)
    sendToPrinter(file.replace(".stl", ".gcode"))
    return "Success"

@app.route('/materialPrint/<material>/<file>/<options>')
def materialPrint(material, file, options):
    file_path = input_dir_path + f"/{file}"
    
    if not preCheck(file, file_path):
        return "Failed precheck 6"
    
    material_file = configuration.get_dir() + "/configurations/" + material + "_config.ini"
    print(material_file)

    # get the part oriented and update the file_path to have the oriented part
    file_path = tweak(file_path)

    # prepare superslicer command
    options_list = options.split()  
    print(options_list)
    sub = [
        configuration.get_dir() + f"/superslicer/superslicer", 
        "-g",
        file_path,
        "--load",
        material_file,
    ] + options_list

    print("Executing:", sub)
    
    result = subprocess.run(
        sub,
        capture_output=True,
        text=True
    )
    
    output = result.stdout.split("\n")
    error = result.stderr

    gcode_file = file_path.replace(".stl", ".gcode")
    moveToOutput(gcode_file)
    sendToPrinter(file.replace(".stl", ".gcode"))
    return "Success"


if __name__ == '__main__':
    configuration.main()
    f = open('dir_paths.json')
    data = json.load(f)
    input_dir_path = data["input_dir_path"]
    output_dir_path = data["output_dir_path"]
    viewing_dir_path = data["viewing_dir_path"]
    printer_ip = data["printer_ip"]

    app.run(debug=True, host='0.0.0.0', port=5000)