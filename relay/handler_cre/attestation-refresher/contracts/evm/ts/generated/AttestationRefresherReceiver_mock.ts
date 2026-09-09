// Code generated — DO NOT EDIT.
import type { Address } from 'viem'
import { addContractMock, type ContractMock, type EvmMock } from '@chainlink/cre-sdk/test'

import { AttestationRefresherReceiverABI } from './AttestationRefresherReceiver'

export type AttestationRefresherReceiverMock = {
  rESOLVER?: () => `0x${string}`
  getExpectedAuthor?: () => `0x${string}`
  getExpectedWorkflowId?: () => `0x${string}`
  getExpectedWorkflowName?: () => `0x${string}`
  getForwarderAddress?: () => `0x${string}`
  owner?: () => `0x${string}`
  supportsInterface?: (interfaceId: `0x${string}`) => boolean
} & Pick<ContractMock<typeof AttestationRefresherReceiverABI>, 'writeReport'>

export function newAttestationRefresherReceiverMock(address: Address, evmMock: EvmMock): AttestationRefresherReceiverMock {
  return addContractMock(evmMock, { address, abi: AttestationRefresherReceiverABI }) as AttestationRefresherReceiverMock
}

