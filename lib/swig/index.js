/**
 * Modern Swig Template Engine - ES6+ Version
 * Updated from original swig@1.4.2
 * 
 * A simple, powerful, and extendable templating engine for node.js and browsers,
 * similar to Django, Jinja2, and Twig.
 */

// Main exports
const swig = require('./lib/swig');

// Export the main swig object
module.exports = swig;

// Also export individual components for backward compatibility
module.exports.swig = swig;
module.exports.default = swig;
