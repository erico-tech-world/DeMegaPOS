import { AsyncLocalStorage } from 'async_hooks'

export interface RequestContext {
    tenantId?: string | null
    branchId?: string | null
    role?: string | null
}

export const requestContext = new AsyncLocalStorage<RequestContext>()

export function getContext() {
    return requestContext.getStore()
}
