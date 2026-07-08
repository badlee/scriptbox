/**
 * Modern Modem Library - ES6+ Version
 * Send and receive messages and make USSD queries using GSM modems
 * Updated from original modem@1.0.3
 */

const { EventEmitter } = require('events');
const SerialPort = require('serialport');
const PDU = require('pdu');

class Modem extends EventEmitter {
    constructor() {
        super();
        this.queue = []; // Holds queue of commands to be executed
        this.isLocked = false; // Device status
        this.partials = {}; // List of stored partial messages
        this.isOpened = false;
        this.jobId = 1;
        this.ussdPdu = true; // Should USSD queries be done in PDU mode?
        this.timeouts = {}; // Store timeouts for each job
        this.port = null;
        this.data = '';
    }

    /**
     * Adds a command to execution queue
     * @param {string} command - AT command
     * @param {Function} callback - Callback function
     * @param {boolean} prior - If true, add to beginning of queue (priority)
     * @param {number} timeout - Timeout in ms (default: 60000)
     * @returns {EventEmitter} The job item
     */
    execute(command, callback, prior = false, timeout = 60000) {
        if (!this.isOpened) {
            this.emit('close');
            return;
        }

        const item = new EventEmitter();
        item.command = command;
        item.callback = callback;
        item.addTime = new Date();
        item.id = ++this.jobId;
        item.timeout = timeout === undefined ? 60000 : timeout;

        if (prior) {
            this.queue.unshift(item);
        } else {
            this.queue.push(item);
        }

        this.emit('job', item);
        process.nextTick(() => this.executeNext());
        return item;
    }

    /**
     * Executes the first item in the queue
     */
    executeNext() {
        if (!this.isOpened) {
            this.emit('close');
            return;
        }

        // Someone else is running, wait
        if (this.isLocked) return;

        const item = this.queue[0];

        if (!item) {
            this.emit('idle');
            return; // Queue is empty
        }

        // Lock the device and null the data buffer for this command
        this.data = '';
        this.isLocked = true;

        item.executeTime = new Date();
        item.emit('start');

        if (item.timeout) {
            this.timeouts[item.id] = setTimeout(() => {
                item.emit('timeout');
                this.release();
                this.executeNext();
            }, item.timeout);
        }

        this.port.write(`${item.command}\r`);
    }

    /**
     * Releases the lock on the modem
     */
    release() {
        this.isLocked = false;
        if (this.timeouts[this.queue[0]?.id]) {
            clearTimeout(this.timeouts[this.queue[0].id]);
            delete this.timeouts[this.queue[0].id];
        }
        process.nextTick(() => this.executeNext());
    }

    /**
     * Opens the serial port connection to the modem
     * @param {string} device - Device path
     * @param {Object} options - Serial port options
     * @param {Function} callback - Callback when opened
     */
    open(device, options, callback) {
        if (typeof callback === 'function') {
            options.parser = SerialPort.parsers.raw;
            this.port = new SerialPort(device, options, (err) => {
                if (err) {
                    if (callback) callback(err);
                    return;
                }
                this._setupPort(callback);
            });
        } else {
            this.port = new SerialPort(device, {
                parser: SerialPort.parsers.raw
            });
            callback = options;
            this._setupPort(callback);
        }
    }

    _setupPort(callback) {
        this.port.on('open', () => {
            this.isOpened = true;
            this.port.on('data', this.dataReceived.bind(this));
            this.emit('open');
            if (callback) callback();
        });

        this.port.on('error', (err) => {
            this.emit('error', err);
            this.isOpened = false;
            this.emit('close');
        });

        this.port.on('close', () => {
            this.isOpened = false;
            this.emit('close');
        });
    }

    /**
     * Handles incoming data from the modem
     * @param {Buffer} data - Incoming data
     */
    dataReceived(data) {
        this.data += data.toString();
        
        // Process complete lines
        while (this.data.includes('\r\n')) {
            const index = this.data.indexOf('\r\n');
            const line = this.data.substring(0, index);
            this.data = this.data.substring(index + 2);
            
            if (line.trim() === '') continue;
            
            this._processLine(line);
        }
    }

    /**
     * Processes a single line from the modem
     * @param {string} line - The line to process
     */
    _processLine(line) {
        const item = this.queue[0];
        if (!item) return;

        // Check for error responses
        if (line.includes('ERROR') || line.includes('+CMS ERROR') || line.includes('+CME ERROR')) {
            item.emit('error', new Error(line));
            this.release();
            this.queue.shift();
            return;
        }

        // Check for OK or specific responses
        if (line === 'OK' || line.includes(item.command)) {
            if (item.callback) {
                item.callback(null, line);
            }
            item.emit('success', line);
            this.release();
            this.queue.shift();
            return;
        }

        // Handle unsolicited responses
        this._handleUnsolicited(line);
    }

    /**
     * Handles unsolicited responses from the modem
     * @param {string} line - The unsolicited response
     */
    _handleUnsolicited(line) {
        // Handle incoming SMS in PDU format
        if (line.startsWith('+CMTI:') || line.startsWith('+CMT:')) {
            // Parse the SMS indicator
            const match = line.match(/\+CMTI:\s*"([^"]+)",\s*(\d+)/);
            if (match) {
                const storage = match[1];
                const index = parseInt(match[2]);
                this._readSMS(storage, index);
            }
        } else if (line.startsWith('+CUSD:')) {
            // Handle USSD response
            const match = line.match(/\+CUSD:\s*(\d+),"([^"]*)",(\d+)/);
            if (match) {
                const type = parseInt(match[1]);
                const message = match[2];
                const length = parseInt(match[3]);
                this.emit('ussd', { type, message, length });
            }
        }
    }

    /**
     * Reads an SMS from the modem storage
     * @param {string} storage - Storage location (e.g., 'SM', 'ME')
     * @param {number} index - SMS index
     */
    _readSMS(storage, index) {
        this.execute(`AT+CMGR=${index}`, (err, response) => {
            if (err) {
                this.emit('error', err);
                return;
            }
            
            // Parse the SMS in PDU format
            const pduMatch = response.match(/\+CMGR:\s*"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)",(\d+),(\d+),(\d+),(\d+),(\d+),(\d+)/);
            if (pduMatch) {
                const [, stat, oa, da, , , length, , , , , , hexData] = pduMatch;
                
                try {
                    const pduData = PDU.parse(hexData);
                    const sms = {
                        sender: oa,
                        receiver: da,
                        text: pduData.message,
                        time: new Date(),
                        smsc: ''
                    };
                    this.emit('sms received', sms);
                } catch (e) {
                    this.emit('error', e);
                }
            }
        });
    }

    /**
     * Sends an SMS message
     * @param {Object} options - SMS options
     * @param {string} options.receiver - Receiver phone number
     * @param {string} options.text - Message text
     * @param {string} [options.encoding='7bit'] - Encoding type
     * @param {Function} callback - Callback function
     */
    sms(options, callback) {
        const { receiver, text, encoding = '7bit' } = options;
        
        // Convert text to PDU format
        const pduText = PDU.encode(text);
        
        // For now, use simple AT commands (PDU mode would be more complex)
        this.execute(`AT+CMGS="${receiver}"`, (err) => {
            if (err) {
                if (callback) callback(err);
                return;
            }
            
            // Send the message text
            this.execute(`${text}\x1A`, (err, response) => {
                if (err) {
                    if (callback) callback(err);
                    return;
                }
                
                if (callback) callback(null, [Date.now().toString()]);
            });
        });
    }

    /**
     * Closes the connection
     */
    close() {
        if (this.port) {
            this.port.close();
        }
        this.isOpened = false;
    }

    /**
     * Dials a phone number
     * @param {string} number - Phone number to dial
     * @param {Function} callback - Callback function
     */
    dial(number, callback) {
        this.execute(`ATD${number};`, callback);
    }

    /**
     * Answers an incoming call
     * @param {Function} callback - Callback function
     */
    answer(callback) {
        this.execute('ATA', callback);
    }

    /**
     * Hangs up a call
     * @param {Function} callback - Callback function
     */
    hangup(callback) {
        this.execute('ATH', callback);
    }

    /**
     * Sends a USSD query
     * @param {string} code - USSD code
     * @param {Function} callback - Callback function
     */
    ussd(code, callback) {
        this.execute(`AT+CUSD=1,"${code}",15`, callback);
    }
}

/**
 * Creates a new Modem instance
 * @returns {Modem} New modem instance
 */
function createModem() {
    return new Modem();
}

// Export as a function for backward compatibility
module.exports = createModem;
module.exports.Modem = Modem;
