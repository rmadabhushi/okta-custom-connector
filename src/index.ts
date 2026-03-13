
import 'dotenv/config'

import {
    Context,
    createConnector,
    readConfig,
    Response,
    logger,
    StdAccountListOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    StdTestConnectionOutput,
    StdAccountListInput,
    StdTestConnectionInput,
    StdEntitlementListOutput
} from '@sailpoint/connector-sdk'

import { MyClient } from './my-client'

export const connector = async () => {

    const config = await readConfig()
    const myClient = new MyClient(config)

    return createConnector()

        // ----------------------------
        // Test Connection
        // ----------------------------
        .stdTestConnection(async (
            context: Context,
            input: StdTestConnectionInput,
            res: Response<StdTestConnectionOutput>
        ) => {

            logger.info("Running test connection")
            await myClient.testConnection()

            res.send({ success: true })
        })

        // ----------------------------
        // Account Aggregation
        // ----------------------------
        .stdAccountList(async (
            context: Context,
            input: StdAccountListInput,
            res: Response<StdAccountListOutput>
        ) => {

            const deltaToken = context.state?.deltaToken

            const result = deltaToken
                ? await myClient.getDeltaAccounts(deltaToken)
                : await myClient.getAllAccounts()

            for (const account of result.accounts) {

                res.send({
                    identity: account.id,
                    uuid: account.id,
                    attributes: {
                        firstName: account.firstName,
                        lastName: account.lastName,
                        email: account.email,
                        status: account.status,
                        groups: account.groups
                    }
                })
            }

            if (result.deltaToken) {
                res.saveState({ deltaToken: result.deltaToken })
            }

            logger.info(`Sent ${result.accounts.length} accounts`)
        })

        // ----------------------------
        // Account Read
        // ----------------------------
        .stdAccountRead(async (
            context: Context,
            input: StdAccountReadInput,
            res: Response<StdAccountReadOutput>
        ) => {

            const account = await myClient.getAccount(input.identity)

            res.send({
                identity: account.id,
                uuid: account.id,
                attributes: {
                    firstName: account.firstName,
                    lastName: account.lastName,
                    email: account.email,
                    status: account.status,
                    groups: account.groups
                }
            })
        })

        // ----------------------------
        // Entitlement List
        // ----------------------------
        .stdEntitlementList(async (
            context: Context,
            input,
            res: Response<StdEntitlementListOutput>
        ) => {

            const groups = await myClient.getAllGroups()

            for (const group of groups) {
                res.send({
                    identity: group.id,
                    type: "group",  // REQUIRED
                    attributes: {
                        name: group.name
                    }
                })
            }

            logger.info(`Sent ${groups.length} groups`)
        })
}