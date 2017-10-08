var settingsJSON = require("./settings.json");
var package = require("./package.json");
var watchFile = true;
const osHomedir = require('os').homedir(),
      fs = require('fs'),
      path = require('path');
var altSettings = {},
    altSettingsName = path.resolve(osHomedir,"."+package.name+".json");
if(fs.existsSync(altSettingsName)){
    try{
        altSettings = require(altSettingsName);
    }catch(e){
        altSettings = {};    
    }
}else{
    if(process.argv[2] !== "config"){
        console.log("Please run \""+package.name+" config\" before");
        process.exit(1);
    }else{
        watchFile = false;
        altSettings={};
    }
}
settings = {};
settings = Object.assign(settingsJSON,altSettings);
// Example when handled through fs.watch listener
if(watchFile)
    fs.watch(altSettingsName, { encoding: 'buffer' }, (eventType, filename) => {
        if (filename) {

            try{
                altSettings = require(altSettingsName);
                settings = Object.assign(settingsJSON,altSettings);
            }catch(e){
                console.error(e);
            }
        }
    });