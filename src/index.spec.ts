import { connector } from './index'
import {
  Connector,
  RawResponse,
  ResponseType,
  StandardCommand,
  AssumeAwsRoleRequest,
  AssumeAwsRoleResponse
} from '@sailpoint/connector-sdk'

import { PassThrough } from 'stream'
import { MyClient } from './my-client'

// ----------------------------------------------------
// Mock Configuration (Simulates ISC injecting config)
// ----------------------------------------------------
const mockConfig: any = {
  token: '00uC4PkFuRR8ypvzCXYx3CGXunra24C5B91BuBKJA5',
  baseUrl: 'https://integrator-3863631.okta.com'
}

process.env.CONNECTOR_CONFIG = Buffer
  .from(JSON.stringify(mockConfig))
  .toString('base64')

// ----------------------------------------------------
// Mock MyClient
// ----------------------------------------------------
jest.mock('./my-client')

const mockedClient = {
  testConnection: jest.fn().mockResolvedValue({}),
  getAllAccounts: jest.fn().mockResolvedValue({
    accounts: [
      {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        status: 'ACTIVE',
        groups: ['grp1']
      }
    ]
  }),
  getAccount: jest.fn().mockResolvedValue({
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    status: 'ACTIVE',
    groups: ['grp1']
  }),
  getAllGroups: jest.fn().mockResolvedValue([
    { id: 'grp1', name: 'Finance Admins' }
  ])
}

;(MyClient as jest.Mock).mockImplementation(() => mockedClient)

// ----------------------------------------------------
// Tests
// ----------------------------------------------------

describe('Connector SDK Tests', () => {

  it('SDK version should match', async () => {
    expect((await connector()).sdkVersion)
      .toStrictEqual(Connector.SDK_VERSION)
  })

  it('should execute stdTestConnection', async () => {

    const stream = new PassThrough({ objectMode: true })
    const output: any[] = []

    stream.on('data', (chunk) => output.push(chunk))

    await (await connector())._exec(
      StandardCommand.StdTestConnection,
      {
        reloadConfig: () => Promise.resolve(),
        assumeAwsRole: (_: AssumeAwsRoleRequest) =>
          Promise.resolve(
            new AssumeAwsRoleResponse(
              'accessKeyId',
              'secretAccessKey',
              'sessionToken',
              '123'
            )
          )
      },
      undefined,
      stream
    )

    expect(mockedClient.testConnection).toHaveBeenCalled()
    expect(output[0].type).toBe(ResponseType.Output)
  })

  it('should execute stdAccountList', async () => {

    const stream = new PassThrough({ objectMode: true })
    const output: any[] = []

    stream.on('data', (chunk) => output.push(chunk))

    await (await connector())._exec(
      StandardCommand.StdAccountList,
      {
        reloadConfig: () => Promise.resolve(),
        assumeAwsRole: () =>
          Promise.resolve(
            new AssumeAwsRoleResponse(
              'accessKeyId',
              'secretAccessKey',
              'sessionToken',
              '123'
            )
          )
      },
      undefined,
      stream
    )

    expect(mockedClient.getAllAccounts).toHaveBeenCalled()
    expect(output[0].type).toBe(ResponseType.Output)
  })

  it('should execute stdAccountRead', async () => {

    const stream = new PassThrough({ objectMode: true })
    const output: any[] = []

    stream.on('data', (chunk) => output.push(chunk))

    await (await connector())._exec(
      StandardCommand.StdAccountRead,
      {
        reloadConfig: () => Promise.resolve(),
        assumeAwsRole: () =>
          Promise.resolve(
            new AssumeAwsRoleResponse(
              'accessKeyId',
              'secretAccessKey',
              'sessionToken',
              '123'
            )
          )
      },
      { identity: '1' },
      stream
    )

    expect(mockedClient.getAccount).toHaveBeenCalledWith('1')
    expect(output[0].type).toBe(ResponseType.Output)
  })

  it('should execute stdEntitlementList', async () => {

    const stream = new PassThrough({ objectMode: true })
    const output: any[] = []

    stream.on('data', (chunk) => output.push(chunk))

    await (await connector())._exec(
      StandardCommand.StdEntitlementList,
      {
        reloadConfig: () => Promise.resolve(),
        assumeAwsRole: () =>
          Promise.resolve(
            new AssumeAwsRoleResponse(
              'accessKeyId',
              'secretAccessKey',
              'sessionToken',
              '123'
            )
          )
      },
      undefined,
      stream
    )

    expect(mockedClient.getAllGroups).toHaveBeenCalled()
    expect(output[0].type).toBe(ResponseType.Output)
  })

})