#!/usr/bin/env node
require('../settings');
var path = require('path'),
    fs = require('fs'),
    os = require('os'),
    osHomedir = os.homedir(),
    package = require("../package.json"),
    Spinner = require('cli-spinner').Spinner,
    altSettings = path.resolve(osHomedir,"."+package.name+".json");
    
var spinner = new Spinner();
spinner.setSpinnerString('|/-\\');
    
const colors = require('colors'),
      emoji = require('node-emoji'),
      name = package.name;


var daemon = require("daemonize2").setup({
    main: path.resolve(__dirname,'..','index.js'),
    name: name,
    silent:true,
    pidfile: path.resolve(require("os").tmpdir(),name+".pid")
});
switch(process.argv[2]){
    case 'stop':
        daemon.on("notrunning",function(){
            spinner.stop();
            process.stderr.write(emoji.get('no_entry')+' NOT RUNNING\n');  
            process.exit();      
        })
        daemon.on("stopped",function(){
            spinner.stop();
            process.stdout.write(emoji.get('+1')+' \n');  
            process.exit();      
        })
        spinner.setSpinnerTitle('%s Server stop... ');            
        spinner.start();
        setTimeout(()=>{
            daemon.stop();
        },200)
    break;
    case 'start':
        daemon.on("error",function(error){
            spinner.stop();
            process.stderr.write(emoji.get('no_entry')+' ERROR\n');  
            console.log(error.message);
            process.exit();      
        })
        daemon.on("running",function(){
            spinner.stop();
            process.stdout.write(emoji.get('no_entry')+' ALREADY RUNNING\n');  
            process.exit();      
        })
        daemon.on("started",function(){
            spinner.stop();
            process.stdout.write(emoji.get('+1')+' \n');
            var interfaces = os.getNetworkInterfaces();
            interfaces = Object.keys(interfaces).map(x=>interfaces[x].filter(x=>x.family == 'IPv4').map(x=>x.address).join(":"+settings.httpPort+", http://")).filter(x=>x).join(":"+settings.httpPort+", http://");

            console.log("Web interfaces at : http://"+interfaces+":"+settings.httpPort);
            
            process.exit();   
        })
        spinner.setSpinnerTitle('%s Server start... ');
        spinner.start();
        setTimeout(()=>{
            daemon.start();
        },200)
        break;
    case 'config':
        require('./config');
        break;
    case 'status':
    default:
        if(!daemon.status()){
            console.log(emoji.get('no_entry')+' Server is stoped'.yellow);  
        }else{
            console.log(emoji.get('+1')+' Server is started'.green);              
        }
        process.exit();
}

