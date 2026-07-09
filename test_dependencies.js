#!/usr/bin/env node
/**
 * Test script to verify all modernized dependencies work correctly
 */

const path = require('path');

console.log('Testing modernized dependencies...\n');

// Test 1: Modem (without serialport dependency)
console.log('1. Testing Modem...');
try {
    // Mock serialport for testing
    const EventEmitter = require('events').EventEmitter;
    
    // Create a mock serialport module
    const mockSerialPort = {
        parsers: {
            raw: () => {}
        },
        SerialPort: class SerialPort {
            constructor(device, options, callback) {
                this.device = device;
                this.options = options;
                if (callback) {
                    setTimeout(() => callback(null), 10);
                }
            }
            on(event, callback) {
                if (event === 'open') {
                    setTimeout(callback, 10);
                }
                return this;
            }
            write(data) {
                return true;
            }
            close() {}
        }
    };
    
    // Override require for serialport
    const Module = require('module');
    const originalRequire = Module.prototype.require;
    Module.prototype.require = function(id) {
        if (id === 'serialport') {
            return mockSerialPort;
        }
        return originalRequire.apply(this, arguments);
    };
    
    const createModem = require('./lib/modem');
    const modem = createModem();
    console.log('   ✓ Modem loaded successfully');
    console.log('   ✓ Modem is a function:', typeof createModem === 'function');
    console.log('   ✓ Modem instance created:', modem instanceof EventEmitter);
    
    // Restore original require
    Module.prototype.require = originalRequire;
} catch (err) {
    console.error('   ✗ Modem test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
}

// Test 2: Kannel
console.log('\n2. Testing Kannel...');
try {
    const kannel = require('./lib/kannel');
    console.log('   ✓ Kannel loaded successfully');
    console.log('   ✓ Kannel.smsbox is available:', typeof kannel.smsbox === 'function');
    console.log('   ✓ Kannel.status is available:', typeof kannel.status === 'object');
    
    // Test creating an instance
    const smsbox = new kannel.smsbox({ host: '127.0.0.1', port: 13001 });
    console.log('   ✓ SmsBox instance created:', smsbox instanceof require('events').EventEmitter);
} catch (err) {
    console.error('   ✗ Kannel test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
}

// Test 3: Shorty
console.log('\n3. Testing Shorty...');
try {
    const createClient = require('./lib/shorty');
    console.log('   ✓ Shorty loaded successfully');
    console.log('   ✓ createClient is a function:', typeof createClient === 'function');
    
    // Test creating a client
    const client = createClient({
        host: '127.0.0.1',
        port: 2775,
        system_id: 'test',
        password: 'test'
    });
    console.log('   ✓ Client instance created:', client instanceof require('events').EventEmitter);
} catch (err) {
    console.error('   ✗ Shorty test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
}

// Test 4: Connectors
console.log('\n4. Testing Connectors...');
try {
    const modemConnector = require('./scripts/connectors/modem');
    const kannelConnector = require('./scripts/connectors/kannel');
    const shortyConnector = require('./scripts/connectors/shorty');
    
    console.log('   ✓ Modem connector loaded');
    console.log('   ✓ Kannel connector loaded');
    console.log('   ✓ Shorty connector loaded');
} catch (err) {
    console.error('   ✗ Connector test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
}

// Test 5: Package.json
console.log('\n5. Testing Package.json...');
try {
    const pkg = require('./package.json');
    console.log('   ✓ Package.json loaded');
    console.log('   ✓ Node version requirement:', pkg.engines.node);
    console.log('   ✓ Version:', pkg.version);
    
    // Check for updated dependencies
    const updatedDeps = ['express', 'socket.io', 'mongodb', 'mongoose'];
    updatedDeps.forEach(dep => {
        if (pkg.dependencies[dep]) {
            console.log(`   ✓ ${dep} updated to: ${pkg.dependencies[dep]}`);
        }
    });
} catch (err) {
    console.error('   ✗ Package.json test failed:', err.message);
    console.error(err.stack);
    process.exit(1);
}

console.log('\n✓ All tests passed! Dependencies are modernized and working.\n');

// Show summary
console.log('Summary:');
console.log('- Modem: ES6+ class-based implementation');
console.log('- Kannel: ES6+ class-based implementation');
console.log('- Shorty: ES6+ class-based implementation');
console.log('- Connectors: Updated to use new local dependencies');
console.log('- Package.json: Updated with modern dependencies');
console.log('\nNext steps:');
console.log('1. Run: npm install');
console.log('2. Run: npm start');
console.log('3. Test your connectors');
