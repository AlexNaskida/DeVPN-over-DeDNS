import { cre, getNetwork, TxStatus, type Runtime } from '@chainlink/cre-sdk'
import {
	type Address,
	bytesToHex,
	encodeAbiParameters,
	keccak256,
	parseAbiParameters,
	toHex,
} from 'viem'
import { z } from 'zod'
import { AttestationRefresherReceiver } from '../contracts/evm/ts/generated/AttestationRefresherReceiver'

// ─── Config Schema ──────────────────────────────────────────
export const configSchema = z.object({
	schedule: z.string(),
	evms: z.array(
		z.object({
			chainSelectorName: z.string(),
			contractAddress: z.string(),
		}),
	),
	// namehash of the operator subname (e.g. carol.dvod-test.eth) this workflow
	// refreshes the attestation_build_hash for.
	operatorNode: z.string(),
})
type Config = z.infer<typeof configSchema>

/**
 * Real CRE workflow - the actual "attest what's running" half of Phase 3.
 *
 * STUB, honestly: there is no real Chainlink CRE handler to hash yet (see
 * docs/chainlink-cre-findings.md - CRE's execution model can't run a persistent
 * tunnel/proxy server at all). Until relay/handler_cre/tunnel-server exists and
 * publishes a real build manifest, the "fresh hash" computed below is a stand-in
 * derived from the config/schedule this workflow itself was deployed with, not from
 * an actual relay binary. What IS real: this workflow really executes inside CRE,
 * really reads on-chain state via EVMClient, and really writes
 * AttestationRefresherReceiver.onReport through a genuine DON-signed report via the
 * KeystoneForwarder - see contracts/ens/src/AttestationRefresherReceiver.sol.
 */
export const onCronTrigger = (runtime: Runtime<Config>): string => {
	const evmConfig = runtime.config.evms[0]
	const node = runtime.config.operatorNode as `0x${string}`

	const network = getNetwork({
		chainFamily: 'evm',
		chainSelectorName: evmConfig.chainSelectorName,
		isTestnet: true,
	})
	if (!network) throw new Error(`Network not found: ${evmConfig.chainSelectorName}`)

	const evmClient = new cre.capabilities.EVMClient(network.chainSelector.selector)
	const receiver = new AttestationRefresherReceiver(evmClient, evmConfig.contractAddress as Address)

	// Real on-chain read: confirms the receiver is live and resolves to the
	// resolver it was deployed pointing at.
	const resolverAddress = receiver.rESOLVER(runtime)
	runtime.log(`AttestationRefresherReceiver.RESOLVER() = ${resolverAddress}`)

	// STUB input (see docstring above) - a real build-manifest hash of
	// relay/handler_cre/tunnel-server once it exists.
	const freshHash = keccak256(toHex(`dvod-tunnel-server-stub-build:${evmConfig.contractAddress}`))

	const report = encodeAbiParameters(parseAbiParameters('bytes32 node, bytes32 newHash'), [
		node,
		freshHash,
	])

	const writeResult = receiver.writeReport(runtime, report)

	if (writeResult.txStatus !== TxStatus.SUCCESS) {
		throw new Error(`Attestation refresh TX failed: ${writeResult.errorMessage || writeResult.txStatus}`)
	}

	const txHash = bytesToHex(writeResult.txHash || new Uint8Array(32))
	runtime.log(`Attestation refreshed for node ${node}. New hash: ${freshHash}. TX: ${txHash}`)

	return `Refreshed - tx: ${txHash}`
}

// ─── Workflow Init ──────────────────────────────────────────
export function initWorkflow(config: Config) {
	const cronTrigger = new cre.capabilities.CronCapability()

	return [cre.handler(cronTrigger.trigger({ schedule: config.schedule }), onCronTrigger)]
}
