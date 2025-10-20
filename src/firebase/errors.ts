'use client';

// Defines the shape of the context object that will be passed to the FirestorePermissionError.
export type SecurityRuleContext = {
    path: string;
    operation: 'get' | 'list' | 'create' | 'update' | 'delete';
    requestResourceData?: any;
};

// Custom error class for Firestore permission errors.
// This class extends the built-in Error class and adds a 'context' property
// that will hold the details of the Firestore operation that failed.
export class FirestorePermissionError extends Error {
    context: SecurityRuleContext;
    
    constructor(context: SecurityRuleContext) {
        // Construct the error message.
        const message = `FirestoreError: Missing or insufficient permissions: The following request was denied by Firestore Security Rules:\n${JSON.stringify(context, null, 2)}`;
        super(message);
        
        // Set the name of the error and the context.
        this.name = 'FirestorePermissionError';
        this.context = context;

        // This line is to ensure the stack trace is captured correctly.
        Object.setPrototypeOf(this, FirestorePermissionError.prototype);
    }
}
