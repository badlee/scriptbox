#!/usr/local/bin/node
/**
 * This file is part of Shorty.
 *
 * Shorty is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; version 3 of the License.
 *
 * Shorty is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with Shorty.  If not, see <http://www.gnu.org/licenses/>.
 *
 * @category   shorty
 * @license    http://www.gnu.org/licenses/gpl-3.0.txt GPL
 * @copyright  Copyright 2010 Evan Coury (http://www.Evan.pro/)
 * @package    examples
 */

var shorty = require('shorty'),
    path   = require('path'),
      util   = require('util'),
    blessed = require('blessed'),
    required = str=>{ return !!str ? true : "Cannot be empty"};
var log = function(){
    //process.stderr.write(util.format.apply(this,arguments)+"\n");
    box.insertTop((new Date).toISOString()+" {bold}[INFO]{/bold} "+util.format.apply(this,arguments))
    screen.render();

}
var logSMS = function(){
    //process.stderr.write(util.format.apply(this,arguments)+"\n");
    box.insertTop((new Date).toISOString()+" {bold}[SMS ]{/bold} "+util.format.apply(this,arguments))
    screen.render();

}
var error = function(){
    //process.stderr.write(util.format.apply(this,arguments)+"\n");
    box.insertTop((new Date).toISOString()+" {bold}[ERR ]{/bold} "+util.format.apply(this,arguments))
    box.render();

}

function sleep(time=100){
    return new Promise(async (okFn,errorFn)=>{
        setTimeout(()=>{
            okFn();
        },time);
    })
}
// Create a screen object.
    var screen = blessed.screen({
      smartCSR: true,
      fullUnicode: true,
      dockBorders: true,
      ignoreDockContrast: true
    });

    screen.title = 'SMPP server [protocol version 3.4]';
    // Quit on Escape, q, or Control-C.
    screen.key(['q', 'C-c', 'C-d'], function(ch, key) {
      return process.exit(0);
    });
    screen.key(['f2','c'], async function(ch, key) {
        clientBox.focus();
    });
    screen.key(['f1','l'], function(ch, key) {
        box.focus();
    });

    screen.key(['f3','m','s'], function(ch, key) {
        boxSMS.focus();
    });
    var titleBar = blessed.Box({
        parent : screen,
        height : 1,
        top : 0,
        content : "{bold}"+screen.title+"{/bold} For test only",
        tags : true,
        style : {
            fg : "black",
            bg : "#ff00f0"
        }
    });
    var stateBar = blessed.Box({
        parent : screen,
        height : 1,
        bottom : 0,
        left : 0,
        content : "Use {bold}Q{/bold} for exit, {bold}F1{/bold}, {bold}F2{/bold} or {bold}F3{/bold} for navigate",
        tags : true,
        style : {
            fg : "black",
            bg : "white"
        }
    })
    var clientBox = blessed.List({
        parent : screen,
          top: 6,
          right: 0,
          width: 20,
          height: '100%-15',
        content : "",
        tags : true,
        interactive : true,
        keys : true,
          label : "[F2] Clients",
          border: {
            type: 'line'
          },
          style: {
            selected : {
                fg :  'black',
                bg : 'white'
            },
            item : {
                bg :  'black',
                fg : 'white'
            },
            border: {
              fg: '#f0f0f0'
            },
            focus: {
                border: {
                    fg: '#ff00f0'
                },
            },
          }
    });
    // "123456789".split("").forEach(x=>clientBox.addItem("Client No"+x))
    clientBox.on('insert item', ()=>{
        infoHost.setLine(2,`Nb Clients ${Object.keys(clients).length}`);
        screen.render();
    });
    clientBox.on('remove item', ()=>{
        let length = Object.keys(clients).length;
        infoHost.setLine(2,`Nb Clients ${length}`);
        if(!length){
            boxSMS.setLabel("[F3] Send SMS ");
        }
        screen.render();
    });
    clientBox.on("select item", ()=>{
        let client = clientBox.getItem(clientBox.selected).getContent();
        // log("The selected client is", client)
        boxSMS.setLabel("[F3] Send SMS to "+client+" ");
        screen.render();
    });
    clientBox.on('focus',()=> {
        stateBar.setContent("Use {bold}↑{/bold} and {bold}↓{/bold} for choose client");
        screen.render();
    });

// Create a box perfectly centered horizontally and vertically.
var box = blessed.ScrollableBox({
    label : "[F1] Logs",
    parent : screen,
  top: 1,
  left: 0,
  width: '100%-20',
  height: '100%-10',
  content: '',
  tags: true,
  keys : true,
  scrollbar : {
        fg: 'white',
        bg: 'magenta'
    },
  border: {
    type: 'line'
  },
  style: {
    scrollbar : {
        fg: 'white',
        bg: 'magenta'
    },
    border: {
      fg: '#f0f0f0'
    },
    focus: {
        border: {
            fg: '#ff00f0'
        },
    }
  }
});
box.on('focus',()=>{
    stateBar.setContent("Use {bold}↑{/bold} and {bold}↓{/bold} for scroll content")
    screen.render();
})

    var  infoHost = blessed.Box({
        parent : screen,
        height : 5,
        width: 20,
        top : 1,
        right : 0,
        content : "IP\nPort\nNb Clients",
        tags : true,
        style : {
            bg : "black",
            fg : "white"
        },
        border: {
            type: 'line'
        },
        label : "Info server"
    })
var boxSMS = blessed.form({
    label : "[F3] Send SMS ",
    parent : screen,
  bottom: 1,
  padding: {
    left: 0,
    right: 0
  },
  left: 'center',
  width: '100%',
  height: 8,
  content: '',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    // fg: 'white',
    // bg: 'magenta',
    border: {
      fg: '#f0f0f0'
    },
    focus: {
        border: {
            fg: '#ff00f0'
        },
    }
  }
});
boxSMS.key('tab', function(ch, key) {
    boxSMS.focusNext();
});
boxSMS.on('focus',()=>{
    stateBar.setContent("Use {bold}TAB{/bold} for navigate")
    screen.render();
})
    
boxSMS.on('submit', function(data) {
    var clientsId = Object.keys(clients);
    if(!clientsId.length){
        return error("No client connected");
    }
    var to = toInput.value.trim();
    var from = fromInput.value.trim();
    var message = messageInput.value.trim();
    var client = clientBox.getItem(clientBox.selected).getContent()
    var id = shortyServer.deliverMessage(client, {
        'source_addr': from,
        'destination_addr': to,
        'sm_length': Buffer.byteLength(message),
        'short_message': new Buffer(message)
    });
    log('Submit message[id:'+id+']', 'to', client,':',message);
  boxSMS.render();
});

var fromInput = new blessed.Textbox({
    parent : boxSMS,
  label : "From",
  top: 0,
    height: 3,
    width : "49%",
    left: 0,
    bg: 'black',
    inputOnFocus : true,
    border: {
        type: 'line'
      },
    style: {
        border: {
          fg: '#f0f0f0'
        },
        focus: {
            border: {
              fg: '#ff0000'
            },

        }
    }
});
fromInput.on('focus',()=> {
    stateBar.setContent("Press {bold}ENTER{/bold} or {bold}ESC{/bold} for exit editing");
    screen.render();
});


var toInput = new blessed.Textbox({
    parent : boxSMS,
  label : "To",
    top: 0,
    height: 3,
    width : "49%",
    right: 0,
    bg: 'black',
    inputOnFocus : true,
    border: {
        type: 'line'
      },
    style: {
        border: {
          fg: '#f0f0f0'
        },
        focus: {
            border: {
              fg: '#ff0000'
            },

        }
    }
});
toInput.on('focus',()=> {
    stateBar.setContent("Press {bold}ENTER{/bold} or {bold}ESC{/bold} for exit editing");
    screen.render();
});


var messageInput = new blessed.Textbox({
    parent : boxSMS,
      label : "Message",
      top: 3,
    height: 3,
    width : "98%-10",
    left: 0,
    bg: 'black',
    inputOnFocus : true,
    border: {
        type: 'line'
      },
    style: {
        border: {
          fg: '#f0f0f0'
        },
        focus: {
            border: {
              fg: '#ff0000'
            },

        }
    }
});
messageInput.on('focus',()=> {
    stateBar.setContent("Press {bold}ENTER{/bold} or {bold}ESC{/bold} for exit editing");
    screen.render();
});

var btnSubmit = blessed.button({
  parent: boxSMS,
  keys: true,
  shrink: true,
    top: 3,
    height: 3,
    width : 10,
  right: 0,
  border: {
    // type: 'line'
  },
  name: 'submit',
  tags:true,
  content: '{center}  Send  {/center}',
  style: {
    bg: 'white',
    fg : 'black',
    focus: {
      bg: 'red',
      fg : 'white',
    }
  }
});
btnSubmit.on('press', function() {
  boxSMS.submit();
});
btnSubmit.on('focus',()=> {
    stateBar.setContent("Press {bold}ENTER{/bold} or {bold}SPACE{/bold} for press");
    screen.render();
});;
var messageId = 0;
var clients = {};
var shortyServer = shorty.createServer(path.join(__dirname,'config.json'));

// all event handlers must be set up before calling shortyServer.start()
shortyServer.on('bind', function(pdu, client, callback) {
    callback("ESME_ROK");
});

shortyServer.on('bindSuccess', function(client, pdu) {
    log(client.system_id,'bind success');
    clients[client.system_id] = client;
    clientBox.insertItem(0, client.system_id)
});

shortyServer.on('deliver_sm_resp', function(client, pdu) {
    log("sms marked as delivered: " + pdu.sequence_number);
});

shortyServer.on('smppError', function(client, err) {
    log("smppError: ",err);
});

shortyServer.on('unbind', function(client, pdu) {
    if(!clients[client.system_id]) return;
    log(client.system_id,"unbinding");
    clients[client.system_id] = undefined;
    delete clients[client.system_id];
    clientBox.removeItem(client.system_id)
});

shortyServer.on('unbind_resp', function(client, pdu) {
    if(!clients[client.system_id]) return;
    log(client.system_id,"unbound");
    clients[client.system_id] = undefined;
    delete clients[client.system_id];
    clientBox.removeItem(client.system_id)
});
shortyServer.on('disconnect', function(client) {
    if(!clients[client.system_id]) return;
    log(client.system_id,"disconnected", client.system_id);
    clients[client.system_id] = undefined;
    delete clients[client.system_id];
    clientBox.removeItem(client.system_id)
})

// client info, pdu info, callback(messageId, status)
shortyServer.on('submit_sm', function(clientInfo, pdu, callback) {
    var source = pdu.source_addr.toString('ascii'),
        dest = pdu.destination_addr.toString('ascii');

    logSMS(pdu.short_message.toString('ascii'));

    // Any messages sent from this number will fail
    if (pdu.sender === "15555551234") {
        // indicate failure
        callback("ESME_RSUBMITFAIL", messageId++);
    } else {
        // indicate success
        callback("ESME_ROK", messageId++);
    }
});

shortyServer.start();
main();
async function main(){
    infoHost.setContent(`IP ${shortyServer.config.host}\nPort ${shortyServer.config.port}\nNb Clients ${Object.keys(clients).length}`);
    screen.render();
};
// async function choix(line)  {
//     line = line.menu;
//   switch (line.trim()) {
//     case 'sms':
//         // await sleep();
//         let lists = Object.keys(clients).map(value=>({name:value, value}));
//         if(lists.length)
//             with(await inquirer.prompt([
//                 {name : 'from', label : "From", validate : required },
//                 {name : 'to', label : "To", validate : required },
//                 {name : 'message', label : "Message" },
//                 {name : 'client', label : "Client SMPP", type:"list",choices : lists }
//             ])){
//                 shortyServer.deliverMessage(client, {
//                     'source_addr': from,
//                     'destination_addr': to,
//                     'sm_length': Buffer.byteLength(message),
//                     'short_message': new Buffer(message)
//                 });
//                 log("SMS sent");
//             }
//         else
//             log('No clients connected!');
//       break;
//     default:
//       log(`Say what? I might have heard '${line.trim()}'`);
//       break;
//       main();
//   }
// }

// process.openStdin();
// // called every time the user writes a line on stdin
// process.stdin.on('data', function(chunk) {
//     var line, parts, message, i, id;

//     // buffer to a string
//     line = chunk.toString();

//     // remove the newline at the end
//     line = line.substr(0, line.length - 1);

//     // split by spaces
//     parts = line.split(" ");

//     // put the message back together
//     message = "";
//     for (i = 2; i < parts.length; i++) {
//         message += parts[i] + " ";
//     }

//     id = shortyServer.deliverMessage('SMSCLOUD', {
//         'source_addr': parts[0],
//         'destination_addr': parts[1],
//         'sm_length': Buffer.byteLength(message),
//         'short_message': new Buffer(message)
//     });
// });

var sighandle = function() {
    shortyServer.stop();
};

process.on('exit', sighandle);
