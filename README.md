----------

# ScriptBox (Kannel Smsbox remplacement)

----------
#### Instalation 

```sh
 git clone https://github.com/badlee/scriptbox.git`
 cd scriptbox
 npm install .
```

#### How use

> run the bearebox

> `bearebox /path/to/kannel.conf`

> run scriptBox
> `node /path/to/scriptBox`

> By default scriptBox listen the port 13014

> Goto to http://127.0.0.1:13014 for the dashboard

> Goto to http://127.0.0.1:13014/admin for administrate

> Default user

> the administrator : login: **oshimin**, password: **secret**

> the active user : login: **bob**, password: **secret** 

> the unactive user : login: **joe**, password: **secret** 

#### Explain SMS service philosophie
> Each SMS service is a 'Mot Cle' (keyword in english)

> Each Mot Cle must be link to a script

> Each Mot Cle must be have a validtor expression(RegEx)

> Each Mot Cle must be have a reject expression(RegEx)

> A service can rewrite SMS, the RegEx used for rewrite is the validator expression.

#### Add a script
> Click on "Main Menu" > "Script" > "Ajouter"
Fill nom(name), description and script (javascript programme), set Module "off".

###### Sample script
```javascript
//Nom: hello
//Description : Hello SMS
//Module : OFF
var message = new MSG(); // build a new sms
message.msgdata = "Hello SMS!"; // set message text 
message.sendSMS(); // send message to the sender
```
this script reply "Hello SMS" on each request.

#### Add a module
> Click on "Main Menu" > "Script" > "Ajouter"
Fill nom(name), description and script (javascript programme), set Module "on".

###### Sample module
```javascript
//Nom: numeros
//Description : Hello SMS
//Module : ON
/*Your script Here*/
exports.airtel = /^((\+|00)?241)?0(4|7)\d{6}$/;
exports.libertis = /^((\+|00)?241)?0(2|6)\d{6}$/;
exports.moov = /^((\+|00)?241)?05\d{6}$/;
exports.azur = /^((\+|00)?241)?03\d{6}$/;
exports.GT = /^((\+|00)?241)?(01)?\d{6}$/;
```
this module can be used in script  `numeros = require('numeros');`

###### Sample script who use module
```javascript
//Nom: hello2
//Description : Hello SMS and get information network
//Module : OFF
var num = require("numeros");
logger.log(sms.sender); // logger is like `console` in nodejs 
// sms contain the SMS object 
var m = new MSG();
	m.msgdata = "Hello SMS!";
	if(num.airtel.test(sms.sender))
		m.msgdata += " - Airtel";
	else if(num.libertis.test(sms.sender))
		m.msgdata += " - Libertis";
	else if(num.azur.test(sms.sender))
		m.msgdata += " - Azur";
	else if(num.moov.test(sms.sender))
		m.msgdata += " - MOOV";
	else if(num.GT.test(sms.sender))
		m.msgdata += " - GT";
	else 
		m.msgdata += " - Je sais pas d'ou vient ce numero";
	
	m.sendSMS();
```
> You can juste create a Mot Cle (keyword) , and send sms for test it;
```javascript
    Nom : test
    Script : hello2
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
    Validateur ^((00|\+)?241) => /^((00|\+)?1)/ => allways start by 241,+241 or 00241
```

#### Add an Mot cle(keyword)
> Click on "Main Menu" > "Mot cle" > "Ajouter"

> Fill nom(name), choose Script, Validateur SMS(Check SMS format),Reject Sender(check sender), Optional Regle de reecriture(it's used for rewrite SMS after validation)

###### Sample Mot Cle
```javascript
    Nom : hello
    Script : hello
    Validateur SMS : Oui
    Reject Sender : Non
```

#### Test Script
> if you have run fakesmsc

> ` /path/to/fakesmsc -m 1 "sender reciever text hello"`

> Or send an SMS to kannel it willl reply "Hello SMS"

#### TODO

 - More documentation
 - More samples
 - Multi SMSC (kannel.js, SMPP v5, shorty)
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