/**
 * Modern Swig Template Engine - ES6+ Compatible
 * 
 * This file maintains the original swig@1.4.2 functionality
 * while ensuring compatibility with modern Node.js versions.
 * 
 * Original: https://github.com/paularmstrong/swig
 */

// Load original swig implementation
const originalSwig = require('./swig-original');

// Export everything from the original
Object.keys(originalSwig).forEach((key) => {
  exports[key] = originalSwig[key];
});

// Ensure setFilter is available at the top level
exports.setFilter = originalSwig.setFilter || function(name, fn) {
  if (exports.filters) {
    exports.filters[name] = fn;
  }
  return exports;
};

// Ensure setDefaults is available at the top level
exports.setDefaults = originalSwig.setDefaults || function(options) {
  if (exports.defaultInstance) {
    Object.assign(exports.defaultInstance.options, options);
  }
  return exports;
};

// Create default instance if it doesn't exist
if (!exports.defaultInstance) {
  exports.defaultInstance = new (originalSwig.Swig || originalSwig)();
}

// Export the version
exports.version = originalSwig.version || '1.4.2-modern';

// Export Swig constructor
exports.Swig = originalSwig.Swig || originalSwig;

// Export loaders
exports.loaders = originalSwig.loaders || require('./loaders');

// Export filters
exports.filters = originalSwig.filters || require('./filters');

// Export tags
exports.tags = originalSwig.tags || require('./tags');

// Export utils
exports.utils = originalSwig.utils || require('./utils');

// Ensure backward compatibility for global swig object
if (typeof global !== 'undefined') {
  global.swig = exports;
}

module.exports = exports;
