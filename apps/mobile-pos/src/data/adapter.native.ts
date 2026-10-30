import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite'
import schema from './schema'

const adapter = new SQLiteAdapter({
    schema,
    jsi: true, // Optional, but better performance
    onSetUpError: (error) => {
        console.error('Database failed to set up', error)
    },
})

export default adapter
