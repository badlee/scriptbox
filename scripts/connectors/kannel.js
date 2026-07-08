/* Modernized Kannel Connector - ES6+ Version */
const path = require('path');
const kannel = require(path.join(__dirname, '..', '..', 'lib', 'kannel'));
const connector = require(path.join(__dirname, '..', '..', 'connector.js'));

let app = null;
let retryConnect = null;

process.on('message', (m) => {
    if (m === 'stop') {
        if (app) {
            app.close();
            clearTimeout(retryConnect);
            app = null;
        }
    } else if (m.type === 'start') {
        if (app && !app.connected) {
            clearTimeout(retryConnect);
            app = null;
        }
        start(m.data);
    } else if (m.type === 'message' || m.type === 'sms') {
        if (app) {
            app.sendSMS(m.message);
        }
    }
});

const start = (conf) => {
    conf.port = Number(conf.port);
    app = new kannel.smsbox(conf);

    const retryToConnect = () => {
        clearTimeout(retryConnect);
        retryConnect = setTimeout(() => {
            console.log('SMS WARN\t\t...retry to connect'.yellow);
            start(conf);
        }, 10000);
        return retryConnect;
    };

    app.on('close', () => {
        process.send({
            type: 'online',
            online: false,
            connection: -1
        });
    });

    app.on('admin', (data) => {
        switch (data.command) {
            case kannel.status.admin.shutdown:
                console.log('SMS WAR Receive shutdown command...retry to connect every 10s'.yellow);
                app.close();
                retryToConnect();
                break;
        }
    });

    app.on('sms', (data) => {
        app.write('ack', {
            nack: kannel.status.ack.buffered,
            id: data.id
        });
        
        if (app.connector) {
            app.connector.execSMS(data);
        }
    });

    app.on('error', (e) => {
        if (['EPIPE', 'ECONNREFUSED'].includes(e.code)) {
            retryToConnect();
        }
    });

    app.on('connect', () => {
        clearTimeout(retryConnect);
        console.log((`SMS LOG scripting box is connected to ${app.conf.host}:${app.conf.port}`).grey);
        
        process.send({
            type: 'online',
            online: true,
            connection: Date.now()
        });

        // Initialize connector
        app.connector = new connector();

        app.connector.on('sendSMS', (data) => {
            app.sendSMS(data);
        });

        app.connector.on('successSMS', (data) => {
            app.write('ack', {
                nack: kannel.status.ack.success,
                id: data.id
            });
        });

        app.connector.on('failSMS', (data) => {
            app.write('ack', {
                nack: kannel.status.ack.failed,
                id: data.id
            });
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

    app.connect();
};

// Export for testing
module.exports = { start };
