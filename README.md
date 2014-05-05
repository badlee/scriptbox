----------

# ScriptBox (smsbox remplacement)

----------
#### Instalation 

> ` npm install scriptbox `

#### How use

> run bearebox just the

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
Fill nom(name), description and script (javascript programme), set off Module.

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