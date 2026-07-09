/**
 * Modern Kannel.js Library - ES6+ Version
 * JavaScript implementation of Kannel Box protocol
 * Updated from original kannel@0.2.7
 */

const { EventEmitter } = require('events');
const net = require('net');
const url = require('url');
const MSG = require('./MSG');
const status = require('./status');
const parser = require('./parser');

parser.setConfig('kannel');

// Polyfill for Buffer.toArray (removed in newer Node versions)
if (!Buffer.prototype.toArray) {
    Buffer.prototype.toArray = function() {
        return Array.from(this);
    };
}

/**
 * SMS Box client for Kannel
 */
class SmsBox extends EventEmitter {
    /**
     * Creates a new SmsBox instance
     * @param {Object|string} conf - Configuration object or URL string
     * @param {Function} [cb] - Callback function
     */
    constructor(conf, cb) {
        super();
        
        this.heartBeat = null;
        this.connected = false;
        this.socket = null;
        
        const defaults = {
            id: '',
            frequence: 5,
            tls: false,
            host: '127.0.0.1',
            port: 13001,
            silentError: true
        };

        if (typeof conf === 'string') {
            try {
                conf = url.parse(conf, true);
                const tmp = parser.parseSync(conf.pathname);
                const tmp2 = {};
                for (const i in conf.query) {
                    try {
                        tmp2[i] = tmp.value(conf.query[i]) || defaults[i];
                    } catch (e) {
                        tmp2[i] = defaults[i];
                    }
                }
                conf = tmp2;
            } catch (e) {
                this.emit('error', e);
                return;
            }
        } else {
            conf = conf || {};
        }

        // Apply defaults
        this.conf = { ...defaults, ...conf };
        Object.seal(this.conf);

        if (cb instanceof Function) {
            cb.call(this, null, this.conf);
        }
    }

    /**
     * Writes a message to the Kannel server
     * @param {string|Object} a - Message or MSG object
     * @param {Object} [c] - Additional data
     * @returns {boolean} Success status
     */
    write(a, c) {
        if (!this.connected) {
            this.emit('error', new Error(`Connection is closed: ${this.heartBeat}`));
            return false;
        }

        if (typeof a === 'string') {
            try {
                a = new MSG(a, c);
            } catch (e) {
                this.emit('error', e);
                return false;
            }
        }

        if ('buff' in a) {
            a = a.buff;
        }

        if (!(a instanceof Buffer)) {
            this.emit('error', new Error('Error Data Type'));
            return false;
        }

        this.socket.write(a);
        return true;
    }

    /**
     * Starts the heartbeat
     * @param {number} time - Heartbeat interval in seconds
     * @returns {boolean} Success status
     */
    heart(time) {
        if (this.heartBeat !== null) return true;

        const a = new MSG('heartbeat', {
            load: 0
        });

        this.heartBeat = setInterval(() => {
            this.write(a.buff);
        }, time * 1000);

        return true;
    }

    /**
     * Sends an SMS message
     * @param {Object} message - SMS message object
     */
    sendSMS(message) {
        const msg = new MSG('sms', {
            id: message.id || Date.now().toString(),
            sender: message.sender || '',
            receiver: message.receiver || '',
            text: message.msgdata || message.text || '',
            coding: message.coding || 0,
            charset: message.charset || 'UTF-8',
            mclass: message.mclass || -1,
            validity: message.validity || ''
        });
        this.write(msg);
    }

    /**
     * Connects to the Kannel server
     */
    connect() {
        const { host, port, tls, id, frequence } = this.conf;
        
        const options = {
            host,
            port: Number(port)
        };

        this.socket = tls ? require('tls').connect(options) : net.createConnection(options);

        this.socket.on('connect', () => {
            this.connected = true;
            this.emit('connect');
            
            // Start heartbeat if configured
            if (frequence > 0) {
                this.heart(frequence);
            }
        });

        this.socket.on('data', (data) => {
            this._handleData(data);
        });

        this.socket.on('close', () => {
            this.connected = false;
            if (this.heartBeat) {
                clearInterval(this.heartBeat);
                this.heartBeat = null;
            }
            this.emit('close');
        });

        this.socket.on('error', (e) => {
            this.emit('error', e);
            if (['EPIPE', 'ECONNREFUSED'].includes(e.code)) {
                // Auto-reconnect logic can be added here
            }
        });
    }

    /**
     * Handles incoming data from the server
     * @param {Buffer} data - Incoming data
     */
    _handleData(data) {
        let buffer = Buffer.concat([this._buffer || Buffer.alloc(0), data]);
        this._buffer = Buffer.alloc(0);

        while (buffer.length > 0) {
            // Try to parse a complete message
            const msg = MSG.parse(buffer);
            if (!msg) break;

            buffer = buffer.slice(msg.length);
            this._processMessage(msg);
        }

        this._buffer = buffer;
    }

    /**
     * Processes a parsed message
     * @param {Object} msg - Parsed message
     */
    _processMessage(msg) {
        switch (msg.type) {
            case 'admin':
                this._handleAdmin(msg);
                break;
            case 'sms':
                this.emit('sms', msg.data);
                this.write('ack', {
                    nack: status.ack.buffered,
                    id: msg.data.id
                });
                break;
            case 'ack':
                // Handle acknowledgment
                break;
            case 'nack':
                // Handle negative acknowledgment
                break;
            default:
                this.emit('message', msg);
        }
    }

    /**
     * Handles admin messages
     * @param {Object} msg - Admin message
     */
    _handleAdmin(msg) {
        switch (msg.data.command) {
            case status.admin.shutdown:
                this.emit('admin', msg.data);
                this.socket.end();
                break;
            default:
                this.emit('admin', msg.data);
        }
    }

    /**
     * Closes the connection
     */
    close() {
        if (this.socket) {
            this.socket.end();
        }
        this.connected = false;
        if (this.heartBeat) {
            clearInterval(this.heartBeat);
            this.heartBeat = null;
        }
    }
}

/**
 * Status constants
 */
const kannel = {
    smsbox: SmsBox,
    status
};

module.exports = kannel;
