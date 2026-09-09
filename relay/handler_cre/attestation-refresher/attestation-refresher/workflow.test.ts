import { describe, expect } from 'bun:test'
import { TxStatus } from '@chainlink/cre-sdk'
import { EvmMock, newTestRuntime, test } from '@chainlink/cre-sdk/test'
import type { Address } from 'viem'
import { newAttestationRefresherReceiverMock } from '../contracts/evm/ts/generated/AttestationRefresherReceiver_mock'
import { initWorkflow, onCronTrigger } from './workflow'

const CHAIN_SELECTOR = 16015286601757825753n // ethereum-testnet-sepolia
const CONTRACT_ADDRESS = '0x63C02d92BEA7F074475ebfeD08773Dd05ba1E647' as Address
const OPERATOR_NODE = '0x266eeed26366229aa73629835e62aa32aca6b06c3dfe36b5ec44ae6c581deb57'

const makeConfig = () => ({
	schedule: '0 */5 * * * *',
	evms: [
		{
			chainSelectorName: 'ethereum-testnet-sepolia',
			contractAddress: CONTRACT_ADDRESS,
		},
	],
	operatorNode: OPERATOR_NODE,
})

describe('onCronTrigger', () => {
	test('reads the receiver, then writes a fresh attestation report', async () => {
		const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)
		const receiverMock = newAttestationRefresherReceiverMock(CONTRACT_ADDRESS, evmMock)

		// Bindings-generator quirk: the type says `rESOLVER`, but the mock is
		// registered at runtime under the literal ABI name `RESOLVER`.
		;(receiverMock as unknown as Record<string, () => string>).RESOLVER = () =>
			'0x0F98C60F734B363Cab6e2B64c74fedC7D9075baF'

		let writeReportCalled = false
		evmMock.writeReport = (input) => {
			writeReportCalled = true
			// The raw report (header + our abi-encoded body) must carry the
			// configured operator node somewhere in its bytes, not a placeholder.
			const hex = Buffer.from(input.report.rawReport).toString('hex')
			expect(hex).toContain(OPERATOR_NODE.slice(2).toLowerCase())
			return { txStatus: TxStatus.SUCCESS, txHash: new Uint8Array(32) }
		}

		const runtime = newTestRuntime()
		;(runtime as any).config = makeConfig()

		const result = onCronTrigger(runtime as any)

		expect(result).toContain('Refreshed')
		expect(writeReportCalled).toBe(true)
	})

	test('throws if the write fails', async () => {
		const evmMock = EvmMock.testInstance(CHAIN_SELECTOR)
		const receiverMock = newAttestationRefresherReceiverMock(CONTRACT_ADDRESS, evmMock)
		// Bindings-generator quirk: the type says `rESOLVER`, but the mock is
		// registered at runtime under the literal ABI name `RESOLVER`.
		;(receiverMock as unknown as Record<string, () => string>).RESOLVER = () =>
			'0x0F98C60F734B363Cab6e2B64c74fedC7D9075baF'

		evmMock.writeReport = () => ({ txStatus: TxStatus.FATAL, errorMessage: 'boom' })

		const runtime = newTestRuntime()
		;(runtime as any).config = makeConfig()

		expect(() => onCronTrigger(runtime as any)).toThrow('boom')
	})
})

describe('initWorkflow', () => {
	test('returns a handler subscribed to the configured cron schedule', () => {
		const config = makeConfig()
		const handlers = initWorkflow(config)

		expect(handlers).toHaveLength(1)
		expect(handlers[0].fn).toBe(onCronTrigger)

		const cronTrigger = handlers[0].trigger as { config?: { schedule?: string } }
		expect(cronTrigger.config?.schedule).toBe(config.schedule)
	})
})
