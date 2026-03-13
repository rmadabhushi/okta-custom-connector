import { ConnectorError } from '@sailpoint/connector-sdk'
import { MyClient } from './my-client'
import fetch from 'node-fetch'

jest.mock('node-fetch')

const mockedFetch = fetch as unknown as jest.Mock

describe('connector client unit tests', () => {

    const mockConfig: any = {
        token: '00uC4PkFuRR8ypvzCXYx3CGXunra24C5B91BuBKJA5',
        baseUrl: 'https://integrator-3863631.okta.com'
    }

    let myClient: MyClient

    beforeEach(() => {
        jest.clearAllMocks()
        myClient = new MyClient(mockConfig)
    })

    it('connector client list accounts', async () => {

        mockedFetch.mockResolvedValue({
            ok: true,
            status: 200,
            headers: {
                get: () => null
            },
            json: async () => ([
                {
                    id: '1',
                    profile: {
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john@test.com'
                    },
                    status: 'ACTIVE'
                }
            ])
        })

        const result = await myClient.getAllAccounts()

        expect(result.accounts.length).toBe(1)
    })

    it('connector client get account', async () => {

        // First fetch: user details
        mockedFetch
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({
                    id: '1',
                    profile: {
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john@test.com'
                    },
                    status: 'ACTIVE'
                })
            })
            // Second fetch: user groups
            .mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ([
                    { id: 'group1' },
                    { id: 'group2' }
                ])
            })

        const account = await myClient.getAccount('1')

        expect(account.id).toBe('1')
        expect(account.groups.length).toBe(2)
    })

    it('connector client test connection', async () => {

        mockedFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ([]),
        })

        const result = await myClient.testConnection()

        expect(result).toStrictEqual({})
    })

    it('invalid connector client', () => {
        expect(() => new MyClient({}))
            .toThrow(ConnectorError)
    })
})