import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs'
import schema from './schema'

let adapter;
try {
    adapter = new LokiJSAdapter({
        schema,
        useIncrementalIndexedDB: false, // Disabling incremental for stability
        useWebWorker: false, // Disabling worker to avoid initialization races
    })
} catch (error) {
    console.error("Failed to create LokiJSAdapter", error);
    // Fallback or rethrow
    throw error;
}

export default adapter

