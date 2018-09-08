var path = require('path'),
    fs = require('fs'),
    { spawn, spawnSync } = require('child_process'),
    osHomedir = require('os').homedir(),
    osTmpdir = require('os').tmpdir(),
    package = require("../package.json"),
    Spinner = require('cli-spinner').Spinner,
    altSettings = path.resolve(osHomedir,"."+package.name+".json"),
    inquirer = require('inquirer'),
    colors = require('colors'),
    caminte = require('caminte'),
    emoji = require('node-emoji'),
    spinner = new Spinner(),
    getDir = dbProdPath => {
        var pwd = process.cwd();
        if(typeof __dirname != "undefined")
            pwd = path.resolve(__dirname,"..");

        return String(dbProdPath).search(/^app:\/\//i) === 0 ? 
            path.resolve.apply(path,[path.sep].concat(String(dbProdPath).replace(/\//g,path.sep).replace("app:"+(path.sep),pwd).split(path.sep).slice(1)))
            : dbProdPath
    },
    Schema = caminte.Schema,
    db = {
         driver     : settings.dbType || "memory",
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
    },
    schema = new Schema(db.driver, db),
    schemaProd = new Schema(dbProd.driver, dbProd);

global.Models = {};

fs.readdirSync(path.join(__dirname,"..","models")).forEach(function(route){
    require(path.join(__dirname,"..","models",route))(schema,schemaProd);
});

let 
    adapterRequiredValue = function(val,values){
        if(values.dbType == "memory") return true;
        let database = adapter[Object.keys(adapter).find(i=>values.dbType == adapter[i][1])];
        return (database[3][this] || (x=>true)).call(values,val);
    },
    adapterRequiredValueProd = function(val,values){
        if(values.dbProdType == "memory") return true;
        let database = adapter[Object.keys(adapter).find(i=>values.dbProdType == adapter[i][1])];
        return (database[3][this] || (x=>true)).call(values,val);
    },
    adapterDefaultValue = function(values){
        if(values.dbType == "memory") return "";
        var database = adapter[Object.keys(adapter).find(i=>values.dbType == adapter[i][1])];
        let ret = database[2][this] || "";
        return this == 'dbPool' ? !!(ret) : ret.toString()+(
            this == 'dbPath' ? "cfg" : ""
        );
    },
    adapterDefaultValueProd = function(values){
        if(values.dbProdType == "memory") return "";
        let database = adapter[Object.keys(adapter).find(i=>values.dbProdType == adapter[i][1])];
        let ret = database[2][this] || "";
        return this == 'dbPool' ? !!(ret) : ret.toString()+(
            this == 'dbPath' ? "data" : ""
        );
    },
    validPort = num=>{
      var number = +num;
      if(!isNumber(num) || number <1 || number > 65535)
          return "Invalid port";
      return true;
    },
    required = str=>{ return !!str ? true : "Cannot be empty"},
    adapter = {
        arango :    ["ArangoDB","arango",{
            dbHost : "127.0.0.1",
            dbPort : "8529",
            dbPath : "sms",
            dbPool : false,
            dbUser : "root"
        },{
            dbHost : required,
            dbPort : validPort
        }],
        firebird :  ["firebird" ,"node-firebird",{
            dbHost : "",
            dbPort : "",
            dbPath : "sms",
            dbPool : false
        },{}],
        mongodb :   ["MongoDB","mongodb",{
            dbHost : "127.0.0.1",
            dbPort : "2770",
            dbPath : "sms",
            dbPool : false
        },{
            dbHost : required,
            dbPort : validPort
        }],
        mongoose :  ["MongoDB(Mongoose)","mongoose",{
            dbHost : "127.0.0.1",
            dbPort : "2770",
            dbPath : "sms",
            dbPool : false
        },{
            dbHost : required,
            dbPort : validPort
        }],
        mysql :     ["MySql","mysql",{
            dbHost : "127.0.0.1",
            dbPort : "3306",
            dbPath : "sms",
            dbPool : true
        },{
            dbHost : required,
            dbPort : validPort
        }],
        nano :      ["Nano","nano",{
            dbHost : "",
            dbPort : "",
            dbPath : "app://sms",
            dbPool : false
        },{}],
        neo4j :     ["Neo4J","neo4j",{
            dbHost : "127.0.0.1",
            dbPort : "",
            dbPath : "sms",
            dbPool : false
        },{}],
        postgres :  ["PostgresSQL","pg",{
            dbHost : "127.0.0.1",
            dbPort : "",
            dbPath : "sms",
            dbPool : true
        },{
            dbHost : required,
            dbPort : validPort
        }],
        redis :     ["Redis" ,"redis",{
            dbHost : "127.0.0.1",
            dbPort : "6379",
            dbPath : "",
            dbPool : false
        },{
            dbHost : required,
            dbPort : validPort
        }],
        rethinkdb : ["RethinkDB","rethinkdb",{
            dbHost : "127.0.0.1",
            dbPort : "",
            dbPath : "sms",
            dbPool : false
        },{}],
        riak :      ["Riak","riak-js",{
            dbHost : "127.0.0.1",
            dbPort : "",
            dbPath : "sms",
            dbPool : false
        },{}],
        sqlite3 :   ["Sqlite","sqlite3",{
            dbHost : "",
            dbPort : "",
            dbPath : "app://sms",
            dbPool : false
        },{}],
        tingodb :   ["TingoDB", "tingodb",{
            dbHost : "",
            dbPort : "",
            dbPath : "app://sms",
            dbPool : false
        },{}]
    },
    // console.log(Models.user.properties.droits.data)
    fields = {
        global : {
            title :             {label : "Name of website", validate : required },
            defaultPwd :        {label : "Password Default", validate : required},
            defaultActif :      {label : "User Active by default", type : "confirm"},
            defautErrorMSG :    {label : "Default error message", type : "input", validate : required},
            defaultDroits :     {label :'Default User Rights', type : "checkbox", default : Object.keys(settings.defaultDroits), choices : Object.keys(Models.user.properties.droits.data).map(x=>{
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
            httpPort :          {label :'Port Http', default : 13014, validate : validPort}
        },
        db:{
            dbType :            {label : "storage Type", type:"list",choices : [{value : 'memory',name : "Memory"}]},
            dbHost :            {label : "Database Server", validate :adapterRequiredValue.bind('dbHost'), default :adapterDefaultValue.bind('dbHost')},
            dbPort :            {label : "Database Server Port", validate :adapterRequiredValue.bind('dbPort'),default :adapterDefaultValue.bind('dbPort')},
            dbPath :            {label : "Database name", validate :adapterRequiredValue.bind('dbPath'),default :adapterDefaultValue.bind('dbPath')},
            dbUser :            {label : "Database username", validate :adapterRequiredValue.bind('dbUser'),default :adapterDefaultValue.bind('dbUser')},
            dbPwd  :            {label : "Database password", validate :adapterRequiredValue.bind('dbPwd'),default :adapterDefaultValue.bind('dbPwd') },
            dbPool :            {label : "Pool Connection", type : "confirm", validate :adapterRequiredValue.bind('dbPool'), default :adapterDefaultValue.bind('dbPool')},
        },
        dbProd : {
            dbProdType :        {label : "storage Type", type:"list",choices : [{value : 'memory',name : "Memory"}]},
            dbProdHost :        {label : "Database Server", validate :adapterRequiredValueProd.bind('dbHost'), default :adapterDefaultValueProd.bind('dbHost') },
            dbProdPort :        {label : "Database Server Port", validate :adapterRequiredValueProd.bind('dbPort'),default :adapterDefaultValueProd.bind('dbPort')},
            dbProdPath :        {label : "Database name", validate :adapterRequiredValueProd.bind('dbPath'),default :adapterDefaultValueProd.bind('dbPath')},
            dbProdUser :        {label : "Database username", validate :adapterRequiredValueProd.bind('dbUser'),default :adapterDefaultValueProd.bind('dbUser')},
            dbProdPwd  :        {label : "Database password", validate :adapterRequiredValueProd.bind('dbPwd'),default :adapterDefaultValueProd.bind('dbPwd') },
            dbProdPool :        {label : "Pool Connection", type : "confirm", validate :adapterRequiredValueProd.bind('dbPool'), default :adapterDefaultValueProd.bind('dbPool')},
        }
    },
    prompt = inquirer.createPromptModule();

//fields.db.dbType.choices=[];fields.dbProd.dbProdType.choices=[];
for(let i in adapter){
    let item = {
        value : adapter[i][1], 
        name : adapter[i][0]
    };
    fields.dbProd.dbProdType.choices.push(item);
    fields.db.dbType.choices.push(item);
}
spinner.setSpinnerString('|/-\\');
spinner.setSpinnerDelay(250);
main();
///////////// functions ///////////////
function sleep(time=100){
    return new Promise(async (okFn,errorFn)=>{
        setTimeout(()=>{
            okFn();
        },time);
    })
}
function defer(message,fn,defer=100){
    return new Promise(async (okFn,errorFn)=>{
        spiner = new Spinner();
        spinner.setSpinnerTitle(`${message} %s`.stripColors.italic);
        spinner.setSpinnerString('|/-\\');
        spinner.start();
        await sleep(defer);
        try{
            await fn();
            okFn();
        }catch(e){
            errorFn(e)
        }
    })
}
function done(message = false){
    return new Promise(async (okFn,errorFn)=>{
        spinner.setSpinnerString("::::");
        //spinner.start();
        //await sleep();
        spinner.stop();
        await sleep(200);
        console.log("",(message || "[Done]").stripColors.bold);
        await sleep();
        spinner.setSpinnerTitle("");
        spinner.setSpinnerString("    ");
        okFn();
    });
}

async function fails(exit = false,code=1){
    await done("[Fails]");
    if(exit){
        spinner.stop(true);
        await sleep(200);
        console.log((exit.message || exit).stripColors.red);
        process.exit(code);
    }
}
function installModule(module){
    return new Promise(async (okFn,errorFn)=>{
        const out = fs.openSync(path.join(osTmpdir,'out.log'), 'w');
        const err = fs.openSync(path.join(osTmpdir,'out.log'), 'w');
        process.chdir(path.join(__dirname,'..','/'));
        console.log("Dir",process.cwd(),spawnSync('pwd',[]).output.map(x=>(x||"").toString()));
        subprocess = spawn('npm', ['i','--no-save',module], {
          detached: true,
          stdio: [ 'ignore', out, err ]
        });
        subprocess.on('close', async (code, signal) => {
          // console.log(
          //   `child process terminated due to receipt of signal ${signal}|${code}`);
            if(code)
                await fails("Installation fails see : "+path.join(osTmpdir,'out.log'))
            else
                await done();
            okFn();
        });
        // subprocess.unref();
        
    })
}
async function save(){
    if(settings.dbType != "memory"){
        let dbType = adapter[Object.keys(adapter).find(i=>settings.dbType == adapter[i][1])][0];
        // console.log(dbType);
        try {
            await defer("Verify "+dbType.white.bold,require.resolve.bind(require,settings.dbType));
        } catch(e){
            await defer("Install "+dbType.white.bold,installModule.bind(null,settings.dbType));
        }
    }
    if(settings.dbProdType != "memory"){
        let dbProdType = adapter[Object.keys(adapter).find(i=>settings.dbProdType == adapter[i][1])][0];
        // console.log(dbProdType);
        try {
            await defer("Verify "+dbProdType.white.bold,require.resolve.bind(require,settings.dbProdType));
        } catch(e){
            await defer("Install "+dbProdType.white.bold,installModule.bind(null,settings.dbProdType));
        }
    }
    await defer("Save configuration",async ()=>{
        fs.writeFile(altSettings, JSON.stringify(settings,null,4), async (err) => {
            if (err){
                // process.stdout.write('ERROR\n');  
                // console.error(err);
                await fails(err);
            }else{
                process.stdout.write(emoji.get('+1')+" Now you can start the server type : \""+(package.name.bold+" start").stripColors.bold+"\""+' \n');
                process.exit(0);
            }
        })
    });
}

// load models 
async function e(choix) {
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

async function main(){
    // inquirer.registerPrompt('selectLine', require('inquirer-select-line'));
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
        
        await e("global")//.then(x=>{
            console.log("[Configuration Database]".bold.yellow);
            await e("db")//.then(x=>{
                console.log("[SMS Database]".bold.yellow);
                await e("dbProd")//.then(x=>{
                    save();
                //});
            //})
        //});
    }
}
/**/

function isNumber(num) {
  var number = +num;

  if ((number - number) !== 0) {
    // Discard Infinity and NaN
    return false;
  }

  if (number === num) {
    return true;
  }

  if (typeof num === 'string') {
    // String parsed, both a non-empty whitespace string and an empty string
    // will have been coerced to 0. If 0 trim the string and see if its empty.
    if (number === 0 && num.trim() === '') {
      return false;
    }
    return true;
  }
  return false;
}