import fetch, { Response } from 'node-fetch'
import { ConnectorError, logger } from '@sailpoint/connector-sdk'

export class MyClient {

    private readonly token: string
    private readonly baseUrl: string

    constructor(config: any) {

        this.token = config?.token
        this.baseUrl = config?.baseUrl

        if (!this.token) {
            throw new ConnectorError("token must be provided")
        }

        if (!this.baseUrl) {
            throw new ConnectorError("baseUrl must be provided")
        }
    }

    // -------------------------------------
    // Generic Request
    // -------------------------------------

    private async request(endpoint: string, retry = 0): Promise<Response> {

        const res = await fetch(`${this.baseUrl}${endpoint}`, {
            headers: {
                Authorization: `SSWS ${this.token}`,
                "Content-Type": "application/json"
            }
        })

        if (res.status === 429 && retry < 3) {
            const wait = Number(res.headers.get("retry-after") || 1)
            await new Promise(r => setTimeout(r, wait * 1000))
            return this.request(endpoint, retry + 1)
        }

        if (!res.ok) {
            throw new ConnectorError(
                `Okta API error ${res.status}: ${res.statusText}`
            )
        }

        return res
    }

    private getNextLink(res: Response): string | null {

        const link = res.headers.get("link")
        if (!link) return null

        const match = link.match(/<([^>]+)>;\s*rel="next"/)
        return match ? match[1].replace(/^https?:\/\/[^/]+/, "") : null
    }

    // -------------------------------------
    // Test Connection
    // -------------------------------------

    async testConnection(): Promise<any> {
        await this.request("/api/v1/users?limit=1")
        return {}
    }

    // -------------------------------------
    // Full Aggregation
    // -------------------------------------

    async getAllAccounts(): Promise<any> {

        let endpoint: string | null = "/api/v1/users?limit=200"
        const accounts: any[] = []

        while (endpoint) {

            const res = await this.request(endpoint)
            const users = await res.json()

            for (const user of users) {

                const groups = await this.getUserGroups(user.id)

                accounts.push({
                    id: user.id,
                    firstName: user.profile?.firstName,
                    lastName: user.profile?.lastName,
                    email: user.profile?.email,
                    status: user.status,
                    groups
                })
            }

            endpoint = this.getNextLink(res)
        }

        return { accounts }
    }

    // -------------------------------------
    // Delta Aggregation
    // -------------------------------------

    async getDeltaAccounts(lastRun: string): Promise<any> {

        let endpoint: string | null =
            `/api/v1/users?filter=lastUpdated gt "${lastRun}"`

        const accounts: any[] = []

        while (endpoint) {

            const res = await this.request(endpoint)
            const users = await res.json()

            for (const user of users) {
                accounts.push({
                    id: user.id,
                    firstName: user.profile?.firstName,
                    lastName: user.profile?.lastName,
                    email: user.profile?.email,
                    status: user.status,
                    groups: []
                })
            }

            endpoint = this.getNextLink(res)
        }

        return {
            accounts,
            deltaToken: new Date().toISOString()
        }
    }

    // -------------------------------------
    // Read Account
    // -------------------------------------

    async getAccount(identity: string): Promise<any> {

        const res = await this.request(`/api/v1/users/${identity}`)
        const user = await res.json()

        const groups = await this.getUserGroups(user.id)

        return {
            id: user.id,
            firstName: user.profile?.firstName,
            lastName: user.profile?.lastName,
            email: user.profile?.email,
            status: user.status,
            groups
        }
    }

    // -------------------------------------
    // Groups
    // -------------------------------------

    async getAllGroups(): Promise<any[]> {

        let endpoint: string | null = "/api/v1/groups?limit=200"
        const groups: any[] = []

        while (endpoint) {

            const res = await this.request(endpoint)
            const data = await res.json()

            for (const g of data) {
                groups.push({
                    id: g.id,
                    name: g.profile?.name
                })
            }

            endpoint = this.getNextLink(res)
        }

        return groups
    }

    // -------------------------------------
    // User Group Membership
    // -------------------------------------

    private async getUserGroups(userId: string): Promise<string[]> {

        const res = await this.request(
            `/api/v1/users/${userId}/groups`
        )

        const groups = await res.json()

        return groups.map((g: any) => g.id)
    }
}