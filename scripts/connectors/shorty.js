/* Modernized Shorty Connector - ES6+ Version */
const path = require('path');
const createClient = require(path.join(__dirname, '..', '..', 'lib', 'shorty'));
const connector = require(path.join(__dirname, '..', '..', 'connector.js'));

let app = null;

process.on('message', (m) => {
    if (m === 'stop') {
        if (app) {
            app.unbind();
            app.shouldReconnect = false;
            app = null;
        }
    } else if (m.type === 'start') {
        if (!app) {
            start(m.data);
        } else if (app && !app.bound) {
            app.connect();
        }
    } else if (m.type === 'message' || m.type === 'sms') {
        sendSMS(m.message);
    }
});

const sendSMS = (data) => {
    if (app) {
        app.sendMessage(toPDU(data));
    }
};

const toPDU = (data) => {
    return {
        source_addr_ton: Number(app.config.addr_ton) || 0,
        source_addr: data.sender || data.source_addr || '',
        dest_addr_ton: Number(app.config.addr_ton) || 0,
        destination_addr: data.receiver || data.destination_addr || '',
        data_coding: data.coding || data.data_coding || 0,
        short_message: Buffer.from(data.msgdata || data.short_message || '', 'utf8'),
        esm_class: data.mclass || data.esm_class || 0
    };
};

const fromPDU = (pdu) => {
    return {
        sender: pdu.source_addr?.toString('utf8') || '',
        receiver: pdu.destination_addr?.toString('utf8') || '',
        msgdata: pdu.short_message?.toString('utf8') || '',
        time: pdu.schedule_delivery_time || new Date(),
        service: pdu.service_type || '',
        id: pdu.sequence_number || 0,
        mclass: pdu.esm_class || 0,
        coding: pdu.data_coding || 0,
        validity: pdu.validity_period || '',
        charset: pdu.data_coding || 0,
        priority: pdu.priority_flag || 0,
        smsc_id: app.config.system_id || ''
    };
};

const start = (conf) => {
    conf.port = Number(conf.port);

    app = createClient({
        smpp: conf,
        debug: true
    });

    /**
     * The submit_sm_resp is emitted when the server sends a submit_sm_resp in
     * response to a submit_sm. It is not aware of status or any error codes. It's
     * up to the application to figure out what to do with those.
     */
    app.on('submit_sm_resp', (pdu) => {
        console.log('sms marked as sent: ' + pdu.sequence_number);
    });

    /**
     * The bindSuccess event is emitted after a bind_x_resp is received with an
     * ESME_ROK status. It is not until this event is emitted that a client can be
     * considered to be properly bound to an SMPP server.
     */
    app.on('bindSuccess', (pdu) => {
        console.log((`SMS LOG scripting box is connected to ${app.config.host}:${app.config.port}`).grey);

        process.send({
            type: 'online',
            online: true,
            connection: Date.now()
        });

        // Initialize connector
        app.connector = new connector();

        app.connector.on('sendSMS', (data) => {
            sendSMS(toPDU(data));
        });

        app.connector.on('successSMS', () => {
            // Success handling
        });

        app.connector.on('failSMS', () => {
            // Failure handling
        });

        app.connector.on('stats++', (id) => {
            process.send({
                type: 'stats++',
                id: id
            });
        });

        app.connector.on('stats--', (id) => {
            process.send({
                type: 'stats--',
                id: id
            });
        });
    });

    /**
     * This event is emitted any time a bind_x_resp is received with a status other
     * than ESME_ROK. Although this event indicates some sort of failure, it is
     * unaware of the reasons for failure. It is up to the application to read the
     * status code from the returned pdu object and determine the problem.
     */
    app.on('bindFailure', (pdu) => {
        process.send({
            type: 'online',
            online: false,
            connection: -1
        });
    });

    /**
     * This event is emitted when the server sends an unbind PDU requesting that the
     * client unbind. Currently, shorty will automatically comply with any unbind
     * requests and send an unbind_resp.
     */
    app.on('unbind', (pdu) => {
        // Unbinding from server
    });

    /**
     * This event is emitted when the server sends an unbind_resp, acknowledging
     * that the client's unbind command.
     */
    app.on('unbind_resp', (pdu) => {
        // Unbind confirmed
    });

    /**
     * This event is emitted when the client is disconnected from the server.
     * This will always happen after an unbind, but can also happen after certain errors.
     */
    app.on('disconnect', () => {
        process.send({
            type: 'online',
            online: false,
            connection: -1
        });
    });

    /**
     * This event is emitted when the server sends a deliver_sm. All that is passed
     * to the application is the parsed PDU. All strings will be left as buffers,
     * and it is up to the application to determine the proper encoding.
     */
    app.on('deliver_sm', (pdu) => {
        if (app.connector) {
            app.connector.execSMS(fromPDU(pdu));
        }
    });

    app.connect();
};

// Export for testing
module.exports = { start, sendSMS, toPDU, fromPDU };
