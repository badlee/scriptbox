
var path = require('path'),
    fs = require('fs'),
    osHomedir = require('os').homedir(),
    package = require("../package.json"),
    Spinner = require('cli-spinner').Spinner,
    altSettings = path.resolve(osHomedir,"."+package.name+".json"),
    inquirer = require('inquirer'),
    colors = require('colors'),
    emoji = require('node-emoji'),
    spinner = new Spinner();

spinner.setSpinnerString('|/-\\');
    
function save(){
    spinner.setSpinnerTitle('%s Save configuration... ');
    spinner.start();
    setTimeout(()=>{
        fs.writeFile(altSettings, JSON.stringify(settings,null,4), function (err) {
            if (err){
                process.stdout.write('ERROR\n');  
                console.error(err);
            }else{
                process.stdout.write(emoji.get('+1')+' \n');
            }
            process.exit();
        })
    },200)
}
/* load models */
function e(choix){
    var caminte = require('caminte'),
    getDir = function (dbProdPath){
        var pwd = process.cwd();
        if(typeof __dirname != "undefined")
            pwd = path.resolve(__dirname,"..");

        return String(dbProdPath).search(/^app:\/\//i) === 0 ? 
            path.resolve.apply(path,[path.sep].concat(String(dbProdPath).replace(/\//g,path.sep).replace("app:"+(path.sep),pwd).split(path.sep).slice(1)))
            : dbProdPath
    },
    Schema = caminte.Schema,
    db = {
         driver     :  settings.dbType || "memory",
         host       : settings.dbHost || "",
         port       : settings.dbPort || "",
         username   : settings.dbUser || "",
         password   : settings.dbPwd || "",
         database   : settings.dbPath ?  getDir(settings.dbPath) :  "",
         pool       : settings.dbPool || false // optional for use pool directly 
    },
    dbProd = {
         driver     :  settings.dbProdType || "memory",
         host       : settings.dbProdHost || "",
         port       : settings.dbProdPort || "",
         username   : settings.dbProdUser || "",
         password   : settings.dbProdPwd || "",
         database   : settings.dbProdPath ? getDir(settings.dbProdPath) :  "",
         pool       : settings.dbProdPool || false // optional for use pool directly 
    };
    schema = new Schema(db.driver, db);
    schemaProd = new Schema(dbProd.driver, dbProd);
    Models = {};
    fs.readdirSync(path.join(__dirname,"../models")).forEach(function(route){
        require(path.join(__dirname,"../models",route))(schema,schemaProd);
    });
    var adapter = {
        arango : 	["ArangoDB","arango"],
        firebird : 	["firebird" ,"node-firebird"],
        mongodb : 	["MongoDB","mongodb"],
        mongoose : 	["MongoDB(Mongoose)","mongoose"],
        mysql : 	["MySql","mysql"],
        nano : 		["Nano","nano"],
        neo4j : 	["Neo4J","neo4j"],
        postgres : 	["PostgresSQL","pg"],
        redis : 	["Redis" ,"redis"],
        rethinkdb : ["RethinkDB","rethinkdb"],
        riak : 		["Riak","riak-js"],
        sqlite3 : 	["Sqlite","sqlite3"],
        tingodb : 	["TingoDB", "tingodb"]
    }
    // console.log(Models.user.properties.droits.data)
    var fields = {
        global : {
            title : 			{label : "Name of website" },
            defaultPwd : 		{label : "Password Default"},
            defaultActif : 		{label : "User Active by default", type : "confirm"},
            defautErrorMSG : 	{label : "Default error message", type : "editor"},
            defaultDroits : 	{label :'Default User Rights', type : "checkbox", default : Object.keys(settings.defaultDroits), choices : Object.keys(Models.user.properties.droits.data).map(x=>{
                x = {
                    name : Models.user.properties.droits.data[x],
                    value : x,
                    checked : false
                }
                if(x.value in settings.defaultDroits && settings.defaultDroits[x.value]){
                    x.checked = true;
                }
                return x;
            })},
            httpPort : 			{label :'Port Http', default : 13014}
        },
        db:{
            dbType : 			{label : "storage Type", type:"list",choices : [{value : 'memory',name : "Memory"}]},
            dbHost : 			{label : "Database Server"},
            dbPort : 			{label : "Database Server Port"},
            dbUser : 			{label : "Database username"},
            dbPwd  : 			{label : "Login Password" },
            dbPath : 			{label : "Name of the database" },
            dbPool : 			{label : "Pool Connection", type : "confirm"},
        },
        dbProd : {
            dbProdType : 		{label : "storage Type", type:"list",choices : [{value : 'memory',name : "Memory"}]},
            dbProdHost : 		{label : "Database Server"},
            dbProdPort : 		{label : "Database Server Port"},
            dbProdUser : 		{label : "Database username"},
            dbProdPwd  : 		{label : "Login Password" },
            dbProdPath : 		{label : "Name of the database" },
            dbProdPool : 		{label : "Pool Connection", type : "confirm" }
        }
    };

    //fields.db.dbType.choices=[];fields.dbProd.dbProdType.choices=[];
    for(var i in adapter){
        try {
            require.resolve(adapter[i][1]);
            fields.db.dbType.choices.push({
                value : adapter[i][1], 
                name : adapter[i][0]
            });
            fields.dbProd.dbProdType.choices.push({
                value : adapter[i][1], 
                name : adapter[i][0]
            });
        } catch(e){}
    }
    for(var i in fields[choix]){
        if(!fields[choix][i].default)
            fields[choix][i].default = settings[i];
        fields[choix][i].name = i;
        fields[choix][i].message = fields[choix][i].label;
    }
    fields[choix] = Object.keys(fields[choix]).map(x=> fields[choix][x]);
    // console.log(fields[choix]);
    return prompt(fields[choix]).then(function (a) {
        switch(choix){
            case "global":
            a.defaultDroits = a.defaultDroits.reduce((a,b)=>{
                a[b] = 1;
                return a;
            },{})
            default:
            // console.log(JSON.stringify(a, null, '  '));
            for (var i in a) {
                if (a.hasOwnProperty(i)) {
                    settings[i] = a[i];
                }
            }
            return settings;        
        }
      }).catch(e=>console.error(e.stack));
}

inquirer.registerPrompt('selectLine', require('inquirer-select-line'));
var prompt = inquirer.createPromptModule();
if(fs.existsSync(altSettings))
    prompt([{
        type: 'list',
        message: 'Select the configuration?',
        name: 'choix',
        choices: [{
            value:"global",
            name: 'Global settings'
        },{
            value:"db",
            name: 'Configuration Database'
        },{
            value:"dbProd",
            name: 'SMS Database'
        }]
    }]).then(function (a) {  
        e(a.choix).then(save);
    });
else{
    console.log("Start configuration".bold);
    console.log("[Global settings]".bold.yellow);
    e("global").then(x=>{
        console.log("[Configuration Database]".bold.yellow);
        e("db").then(x=>{
            console.log("[SMS Database]".bold.yellow);
            e("dbProd").then(x=>{
                console.log("Now you can start the server type : \""+package.name.bold+" start".bold+"\"");
                save();
            });
        })
    });
}