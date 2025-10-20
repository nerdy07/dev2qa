'use client';
import { EventEmitter } from 'events';

// This is a simple event emitter that will be used to broadcast errors.
// We are using the 'events' package, which is a standard Node.js module
// that is also available in the browser.

// The emitter is exported as a singleton, so that the same instance is used
// across the application. This allows us to emit an error in one part of the
// app and listen for it in another.

export const errorEmitter = new EventEmitter();
