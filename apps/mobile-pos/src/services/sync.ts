import { synchronize } from '@nozbe/watermelondb/sync'
import { database } from '../data/database'
import axios from 'axios'

const API_URL = 'http://YOUR_BACKEND_IP:3000'

export async function sync(accessToken: string) {
    await synchronize({
        database,
        pullChanges: async ({ lastPulledAt }) => {
            const response = await axios.get(`${API_URL}/sync/pull`, {
                params: { lastPulledAt },
                headers: { Authorization: `Bearer ${accessToken}` },
            })

            if (response.status !== 200) {
                throw new Error('Failed to pull changes')
            }

            const { changes, timestamp } = response.data
            return { changes, timestamp }
        },
        pushChanges: async ({ changes, lastPulledAt }) => {
            const response = await axios.post(`${API_URL}/sync/push`, changes, {
                params: { lastPulledAt },
                headers: { Authorization: `Bearer ${accessToken}` },
            })

            if (response.status !== 200) {
                throw new Error('Failed to push changes')
            }
        },
        migrationsEnabledAtVersion: 1,
    })
}
