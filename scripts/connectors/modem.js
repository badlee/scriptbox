/* Modernized Modem Connector - ES6+ Version */
const path = require('path');
const createModem = require(path.join(__dirname, '..', '..', 'lib', 'modem'));
const connector = require(path.join(__dirname, '..', '..', 'connector.js'));

const modem = createModem();

process.on('message', (m) => {
    if (m === 'stop') {
        if (modem.isOpened) {
            modem.close();
        }
    } else if (m.type === 'start') {
        if (!modem.isOpened) {
            start(m.data);
        } else if (modem && !modem.connected) {
            modem.connect();
        }
    } else if (m.type === 'message' || m.type === 'sms') {
        sendSMS(m.message);
    }
});

let currentConnector = null;

const sendSMS = (data) => {
    if (!modem.isOpened) {
        console.log('Modem not opened');
        return;
    }
    
    modem.sms({
        receiver: data.receiver,
        text: data.msgdata,
        encoding: data.encoding || '7bit'
    }, (err, sentIds) => {
        if (err) {
            console.log('Error sending sms:', err);
        } else {
            console.log('>>', arguments);
            process.send({
                type: 'stats++',
                id: sentIds[0]
            });
            console.log('Message sent successfully, here are reference ids:', sentIds.join(','));
        }
    });
};

const fromSMS = (data) => {
    return {
        sender: data.sender,
        receiver: modem.config?.number || '',
        msgdata: data.text,
        time: data.time,
        smsc_id: data.smsc
    };
};

const start = (conf) => {
    modem.open(conf.device || '/dev/ttyUSB0', conf.options || {}, (err) => {
        if (err) {
            console.error('Error opening modem:', err);
            process.send({
                type: 'online',
                online: false,
                connection: -1
            });
            return;
        }

        // Set up event handlers
        modem.on('sms received', (sms) => {
            console.log('SMS received:', sms);
            if (currentConnector) {
                currentConnector.execSMS(fromSMS(sms));
            }
        });

        modem.on('error', (err) => {
            console.error('Modem error:', err);
        });

        modem.on('close', () => {
            console.log('Modem connection closed');
            process.send({
                type: 'online',
                online: false,
                connection: -1
            });
        });

        modem.on('open', () => {
            console.log('Modem opened successfully');
            process.send({
                type: 'online',
                online: true,
                connection: Date.now()
            });

            // Initialize connector
            currentConnector = new connector();

            currentConnector.on('sendSMS', (data) => {
                sendSMS(data);
            });

            currentConnector.on('successSMS', () => {});
            currentConnector.on('failSMS', () => {});

            currentConnector.on('stats++', (id) => {
                process.send({
                    type: 'stats++',
                    id: id
                });
            });

            currentConnector.on('stats--', (id) => {
                process.send({
                    type: 'stats--',
                    id: id
                });
            });
        });
    });
};

// Export for testing
module.exports = { modem, sendSMS, fromSMS, start };
