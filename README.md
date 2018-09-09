----------

# ScriptBox SMS gateway

----------
#### Instalation 

```sh
 npm install -g scriptbox
```

*[For contributors see detailed instructions here](https://github.com/badlee/scriptbox/wiki/Install-Instructions)*

#### How use

> In first you need configure the scriptbox

> `scriptbox config`

> After config, run scriptBox
> `scriptbox start`

> By default scriptBox listen the port 13014

> Goto to http://127.0.0.1:13014 for the dashboard

> Goto to http://127.0.0.1:13014/admin for administrate

> Default user

> the administrator : login: **oshimin**, password: **secret**

> the active user : login: **bob**, password: **secret** 

> the unactive user : login: **joe**, password: **secret** 

#### Explain SMS service philosophy
> Each SMS service is a 'Mot Cle' (keyword in english)

> Each Mot Cle must be link to a script

> Each Mot Cle must be have a validtor expression(RegEx)

> Each Mot Cle must be have a reject expression(RegEx)

> A service can rewrite SMS, with Rewriter script.

> The Rewriter script it's only for modify sms value, it run in an isolate js context and the runing time cannot exced  25ms.

#### Add a script
> Click on "Main Menu" > "Script" > "Ajouter"
Fill nom(name), description and script (javascript programme), set Module "off".

###### Sample script
```javascript
//Nom: echo
//Description : Echo SMS
//Module : OFF
var message = new MSG(sms); // build a new sms
message.sendSMS(); // send message to the sender
```
this script resend the recieved message .

#### Add a module
> Click on "Main Menu" > "Script" > "Ajouter"
Fill nom(name), description and script (javascript programme), set Module "on".

###### Sample module
```javascript
//Nom: gabonNumber
//Description : Validate gaboneese numbers
//Module : ON
/*Your script Here*/
exports.airtel = /^((\+|00)?241)?0(4|7)\d{6}$/;
exports.libertis = /^((\+|00)?241)?0(2|6)\d{6}$/;
exports.moov = /^((\+|00)?241)?05\d{6}$/;
exports.GT = /^((\+|00)?241)?(01)?\d{6}$/;
```
this module can be used in script  `numeros = require('gabonNumber');`

###### Sample script who use module
```javascript
//Nom: hello
//Description : Send Hello SMS and get information network
//Module : OFF
var num = require("gabonNumber");
logger.log(sms.sender); // logger is like `console` in nodejs 
// sms contain the SMS object 
var m = new MSG(sms);
m.msgdata = "Hello SMS!";
if(num.airtel.test(sms.sender))
	m.msgdata += " - Airtel";
else if(num.libertis.test(sms.sender))
	m.msgdata += " - Libertis";
else if(num.moov.test(sms.sender))
	m.msgdata += " - MOOV";
else if(num.GT.test(sms.sender))
	m.msgdata += " - GT";
else 
	m.msgdata += " - Unknow";

m.sendSMS();
```
> You can juste create a Mot Cle (keyword) , and send sms for test it;
```javascript
    Nom : test
    Script : hello
    Validateur SMS : Oui
    Reject Sender : Non
```


#### Add an expression
> Click on "Main Menu" > "Expression" > "Ajouter"
> Fill nom(name), Validateur(RegExp), Choose Option

###### Sample expression
```javascript
    Nom : Oui
    Validateur (?:) => /(?:)/ => allways true
    
    Nom : Non
    Validateur ^[^\w\W]$ => /^[^\w\W]$/ => allways false

    Nom : Gaboneese number
    Validateur ^((00|\+)?241)0[1234567]\d{6} => /^((00|\+)?241)0[1234567]\d{6}/ => allways start by 241,+241 or 00241
```

#### Add a connector
> Click on "Main Menu" > "Connecteor" > "Ajouter"
> Fill Identifiant(name), Choose Type

###### Sample connector
```javascript
    Nom : KANNEL
    Type : KANNEL
```

###### Sample Connfig connector
```javascript
    host : 127.0.0.1
    Port : 13013
    id : LoveIsMyReligion
    tls : false
```
###### Start a connector
> Click on "Main Menu" > "Connecteor" > "List" > Start Server

###### Stop a connector
> Click on "Main Menu" > "Connecteor" > "List" > Stop Server

#### Add an Mot cle(keyword)
> Click on "Main Menu" > "Mot cle" > "Ajouter"

> Fill nom(name), choose Script, Validateur SMS(Check SMS format),Reject Sender(check sender), "Numeros Courts(short Code allowed, no select for all short Codes)

###### Sample Mot Cle
```javascript
    Nom : hello
    Script : hello
    Validateur SMS : Oui
    Reject Sender : Non
    Rewriter Script : /*Empty*/
```

#### Test Script
Configue and start the connector (SMPP or kannel) and send "hello" to the connector, scriptbox willl reply "Hello SMS"

#### TODO

 - More documentation
 - More samples (Ex. voting system)
 - Routing system
 - Script installer for production instance 
 
#### Screen Capture
![Capture 9][9]

![Capture 2][2]

![Capture 1][1]

![Capture 3][3]

![Capture 4][4]

![Capture 5][5]

![Capture 6][6]

![Capture 7][7]

![Capture 8][8]

#### LICENCE

>(The MIT License)

>Copyright (c) 2007-2009 Ulrich Badinga &lt;badinga.ulrich@gmail.com&gt;

>Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
'Software'), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

>The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

>THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


  [1]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-1.png
  [2]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-2.png
  [3]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-3.png
  [4]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-4.png
  [5]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-5.png
  [6]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-6.png
  [7]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-7.png
  [8]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-8.png
  [9]: https://raw.githubusercontent.com/badlee/scriptbox/master/media/Capture-9.png
