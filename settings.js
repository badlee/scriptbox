var settingsJSON = require("./settings.json");
var package = require("./package.json");
var watchFile = true;
const osHomedir = require('os').homedir(),
      fs = require('fs'),
      path = require('path');
var altSettings = {},
    altSettingsName = path.resolve(osHomedir,"."+package.name+".json"),
    getDir = function (dirPath){
    var pwd = process.cwd();
    if(typeof __dirname != "undefined")
        pwd = __dirname;
        
    return String(dirPath).search(/^app:\/\//i) === 0 ? 
        path.resolve.apply(path,[path.sep].concat(String(dirPath).replace(/\//g,path.sep).replace("app:"+(path.sep),pwd).split(path.sep).slice(1)))
        : dirPath
};
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
// check and trow if fails
switch(settingsJSON.dbType){
    case "tingodb":
        if (!fs.existsSync(getDir(settingsJSON.dbPath))) {
            try{
                fs.mkdirSync(getDir(settingsJSON.dbPath));
                console.log(getDir(settingsJSON.dbPath), "Created!")
            }catch(e){
                throw new Error('Database directory not exists ' + settingsJSON.dbPath + ', please create!');                
            }
        }
        break;
}

switch(settingsJSON.dbProType){
    case "tingodb":
        if (!fs.existsSync(getDir(settingsJSON.dbProPath))) {
            try{
                fs.mkdirSync(getDir(settingsJSON.dbProPath))
            }catch(e){
                throw new Error('Database directory not exists ' + settingsJSON.dbProPath + ', please create!');                
            }
        }
        break;
}