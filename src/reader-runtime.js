// Canonical Reader runtime. Module order preserves the former browser load order:
// core render owner -> interaction owner -> edition owner -> magazine presentation owner.
import './reader/core.js';
import './reader/interactions.js';
import './reader/edition.js';
import './reader/magazine.js';
