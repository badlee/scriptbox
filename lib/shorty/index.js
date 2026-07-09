/**
 * Modern Shorty Library - ES6+ Version
 * An asynchronous SMPP client and server built on Node.js
 * Updated from original shorty@0.5.5
 */

const net = require('net');
const { EventEmitter } = require('events');
const util = require('util');
const writer = require('./pdu-writer');
const data = require('./data-handler');
const common = require('./common');
const smpp = require('./smpp-definitions');

// Set up SMPP definitions
writer.setSmppDefinitions(smpp);
data.setSmppDefinitions(smpp);

/**
 * SMPP Client
 */
class Client extends EventEmitter {
    /**
     * Creates a new SMPP client
     * @param {Object} config - Client configuration
     * @param {Object} [smppDefs] - SMPP definitions (optional)
     */
    constructor(config, smppDefs) {
        super();
        
        this.config = { ...config };
        this.socket = null;
        this.sequenceNumber = 1;
        this.bound = false;
        this.bindType = 0;
        this.connectTime = null;
        this.startTime = new Date();
        this.shouldReconnect = true;
        this.reconnectTimer = null;
        this.splitPacketBuffer = Buffer.alloc(0);

        if (smppDefs) {
            writer.setSmppDefinitions(smppDefs);
            data.setSmppDefinitions(smppDefs);
        }
    }

    /**
     * Sets up reconnection
     */
    setupReconnect() {
        this.sequenceNumber = 1;
        this.bound = false;
        this.bindType = 0;
        this.splitPacketBuffer = Buffer.alloc(0);
        this.connect();
    }

    /**
     * Attempts to reconnect
     */
    reconnect() {
        if (this.shouldReconnect && this.reconnectTimer === null) {
            const reconnectInterval = this.config.client_reconnect_interval !== undefined 
                ? parseInt(this.config.client_reconnect_interval) 
                : 2500;

            this.reconnectTimer = setInterval(() => {
                this.setupReconnect();
            }, reconnectInterval);
        }
    }

    /**
     * Gets the next sequence number
     * @returns {number} Next sequence number
     */
    getSeqNum() {
        if (this.sequenceNumber > 0x7FFFFFFF) {
            this.sequenceNumber = 1;
        }
        return ++this.sequenceNumber;
    }

    /**
     * Connects to the SMPP server
     */
    connect() {
        // Clear any existing reconnect timer
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        // Create new connection
        this.socket = net.createConnection(this.config.port, this.config.host);

        this.socket.on('end', () => this.connectionClose());
        this.socket.on('close', () => this.connectionClose());
        this.socket.on('error', (err) => this.socketErrorHandler(err));

        this.socket.on('connect', () => {
            this.connectTime = new Date();
            this.emit('connect');

            // Attempt to bind immediately upon connection
            this.bind();
        });

        this.socket.on('data', (buffer) => {
            this.handleData(buffer);
        });
    }

    /**
     * Handles connection close
     */
    connectionClose() {
        this.bound = false;
        this.emit('close');
        
        // Attempt to reconnect if configured
        if (this.shouldReconnect) {
            this.reconnect();
        }
    }

    /**
     * Handles socket errors
     * @param {Error} err - Error object
     */
    socketErrorHandler(err) {
        this.emit('error', err);
        
        // Clear connection state
        this.bound = false;
        
        // Attempt to reconnect if configured
        if (this.shouldReconnect) {
            this.reconnect();
        }
    }

    /**
     * Handles incoming data
     * @param {Buffer} buffer - Incoming data buffer
     */
    handleData(buffer) {
        // Concatenate with any existing partial buffer
        const fullBuffer = Buffer.concat([this.splitPacketBuffer, buffer]);
        
        // Process complete PDUs
        let offset = 0;
        while (offset < fullBuffer.length) {
            // Check if we have enough data for a PDU header (16 bytes)
            if (fullBuffer.length - offset < 16) {
                this.splitPacketBuffer = fullBuffer.slice(offset);
                return;
            }

            // Read PDU length (first 4 bytes, big-endian)
            const pduLength = fullBuffer.readUInt32BE(offset);
            
            // Check if we have the complete PDU
            if (fullBuffer.length - offset < pduLength) {
                this.splitPacketBuffer = fullBuffer.slice(offset);
                return;
            }

            // Extract the complete PDU
            const pduBuffer = fullBuffer.slice(offset, offset + pduLength);
            offset += pduLength;

            // Parse and emit the PDU
            this.handlePDU(pduBuffer);
        }

        // Clear the split packet buffer
        this.splitPacketBuffer = Buffer.alloc(0);
    }

    /**
     * Handles a parsed PDU
     * @param {Buffer} pduBuffer - PDU buffer
     */
    handlePDU(pduBuffer) {
        try {
            const pdu = data.parse(pduBuffer);
            
            // Handle different PDU types
            switch (pdu.command_id) {
                case smpp.COMMAND_ID.BIND_TRANSCEIVER_RESP:
                    this.handleBindResponse(pdu);
                    break;
                case smpp.COMMAND_ID.SUBMIT_SM_RESP:
                    this.emit('submit_sm_resp', pdu);
                    break;
                case smpp.COMMAND_ID.DELIVER_SM:
                    this.emit('deliver_sm', pdu);
                    break;
                case smpp.COMMAND_ID.UNBIND:
                    this.emit('unbind', pdu);
                    this.socket.end();
                    break;
                case smpp.COMMAND_ID.UNBIND_RESP:
                    this.emit('unbind_resp', pdu);
                    this.socket.end();
                    break;
                case smpp.COMMAND_ID.ENQUIRE_LINK:
                    this.handleEnquireLink(pdu);
                    break;
                case smpp.COMMAND_ID.ENQUIRE_LINK_RESP:
                    // Handle enquire link response
                    break;
                default:
                    this.emit('pdu', pdu);
            }
        } catch (err) {
            this.emit('error', err);
        }
    }

    /**
     * Handles bind response
     * @param {Object} pdu - PDU object
     */
    handleBindResponse(pdu) {
        if (pdu.command_status === smpp.STATUS.ESME_ROK) {
            this.bound = true;
            this.bindType = pdu.command_id;
            this.emit('bindSuccess', pdu);
        } else {
            this.emit('bindFailure', pdu);
        }
    }

    /**
     * Handles enquire link PDU
     * @param {Object} pdu - PDU object
     */
    handleEnquireLink(pdu) {
        // Send enquire link response
        const response = writer.writeEnquireLinkResp(this.getSeqNum());
        this.socket.write(response);
    }

    /**
     * Binds to the SMPP server
     */
    bind() {
        let bindPDU;
        
        switch (this.config.bind_type) {
            case 'transceiver':
                bindPDU = writer.writeBindTransceiver(
                    this.getSeqNum(),
                    this.config.system_id,
                    this.config.password,
                    this.config.system_type || '',
                    this.config.interface_version || 0x34,
                    this.config.addr_ton || 0,
                    this.config.addr_npi || 0,
                    this.config.address_range || ''
                );
                break;
            case 'receiver':
                bindPDU = writer.writeBindReceiver(
                    this.getSeqNum(),
                    this.config.system_id,
                    this.config.password,
                    this.config.system_type || '',
                    this.config.interface_version || 0x34,
                    this.config.addr_ton || 0,
                    this.config.addr_npi || 0,
                    this.config.address_range || ''
                );
                break;
            case 'transmitter':
            default:
                bindPDU = writer.writeBindTransmitter(
                    this.getSeqNum(),
                    this.config.system_id,
                    this.config.password,
                    this.config.system_type || '',
                    this.config.interface_version || 0x34,
                    this.config.addr_ton || 0,
                    this.config.addr_npi || 0,
                    this.config.address_range || ''
                );
                break;
        }

        this.socket.write(bindPDU);
    }

    /**
     * Sends a message
     * @param {Object} pdu - PDU to send
     */
    sendMessage(pdu) {
        if (!this.bound) {
            this.emit('error', new Error('Not bound to server'));
            return;
        }
        
        const buffer = writer.writePDU(pdu);
        this.socket.write(buffer);
    }

    /**
     * Unbinds from the server
     */
    unbind() {
        const pdu = writer.writeUnbind(this.getSeqNum());
        this.socket.write(pdu);
        this.shouldReconnect = false;
    }

    /**
     * Disconnects from the server
     */
    disconnect() {
        this.shouldReconnect = false;
        if (this.reconnectTimer) {
            clearInterval(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.socket) {
            this.socket.end();
        }
    }
}

/**
 * Creates a new client
 * @param {Object} config - Client configuration
 * @param {Object} smppDefs - SMPP definitions
 * @returns {Client} New client instance
 */
function createClient(config, smppDefs) {
    return new Client(config, smppDefs);
}

module.exports = createClient;
module.exports.Client = Client;
module.exports.createClient = createClient;
