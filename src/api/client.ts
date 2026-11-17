// The API surface that the pages use. `src/config.ts` decides the mode:
// mock mode -> ./mock.ts (in-memory data), real mode -> ./real.ts (`fetch` to the gateway).
// Both files have the same function names and signatures.
import { MOCK } from '../config'
import * as mock from './mock'
import * as real from './real'
import type { HostKind, PlatformStatus } from './types'

export { ApiError } from './errors'
export { CONTRACT_TRANSITIONS, WINDOW_MINUTES, COMPRESSED_START_MS, installmentOf, randomCustomerInput } from './mock'
export { SLOW_CALL_MS, formatCpf, isValidCpf, speedOf } from './map'
export type { PageInfo, Speed } from './map'

export const getMe: typeof mock.getMe = MOCK ? mock.getMe : real.getMe
export const saveProfile: typeof mock.saveProfile = MOCK ? mock.saveProfile : real.saveProfile
export const getEngine: typeof mock.getEngine = MOCK ? mock.getEngine : real.getEngine
export const getHosts: typeof mock.getHosts = MOCK ? mock.getHosts : real.getHosts
export const getActivity: typeof mock.getActivity = MOCK ? mock.getActivity : real.getActivity
export const startSession: typeof mock.startSession = MOCK ? mock.startSession : real.startSession
export const getSession: typeof mock.getSession = MOCK ? mock.getSession : real.getSession
export const listMySessions: typeof mock.listMySessions = MOCK ? mock.listMySessions : real.listMySessions
export const sendContact: typeof mock.sendContact = MOCK ? mock.sendContact : real.sendContact
export const listAgreements: typeof mock.listAgreements = MOCK ? mock.listAgreements : real.listAgreements
export const listCustomers: typeof mock.listCustomers = MOCK ? mock.listCustomers : real.listCustomers
export const listSimulations: typeof mock.listSimulations = MOCK ? mock.listSimulations : real.listSimulations
export const listContracts: typeof mock.listContracts = MOCK ? mock.listContracts : real.listContracts
export const createCustomer: typeof mock.createCustomer = MOCK ? mock.createCustomer : real.createCustomer
export const changeIncome: typeof mock.changeIncome = MOCK ? mock.changeIncome : real.changeIncome
export const getMargin: typeof mock.getMargin = MOCK ? mock.getMargin : real.getMargin
export const simulate: typeof mock.simulate = MOCK ? mock.simulate : real.simulate
export const createContract: typeof mock.createContract = MOCK ? mock.createContract : real.createContract
export const contractAction: typeof mock.contractAction = MOCK ? mock.contractAction : real.contractAction
export const previewSimulation: typeof mock.previewSimulation = MOCK ? mock.previewSimulation : real.previewSimulation
export const getSnapshot: typeof mock.getSnapshot = MOCK ? mock.getSnapshot : real.getSnapshot
export const adminListUsers: typeof mock.adminListUsers = MOCK ? mock.adminListUsers : real.adminListUsers
export const adminUserAction: typeof mock.adminUserAction = MOCK ? mock.adminUserAction : real.adminUserAction
export const adminListSessions: typeof mock.adminListSessions = MOCK ? mock.adminListSessions : real.adminListSessions
export const adminGetState: typeof mock.adminGetState = MOCK ? mock.adminGetState : real.adminGetState
export const adminSetPaused: typeof mock.adminSetPaused = MOCK ? mock.adminSetPaused : real.adminSetPaused
export const adminStopEngine: typeof mock.adminStopEngine = MOCK ? mock.adminStopEngine : real.adminStopEngine
export const adminListContacts: typeof mock.adminListContacts = MOCK ? mock.adminListContacts : real.adminListContacts
export const endSession: typeof mock.endSession = MOCK ? mock.endSession : real.endSession
export const adminDeleteUser: typeof mock.adminDeleteUser = MOCK ? mock.adminDeleteUser : real.adminDeleteUser
export const adminSetWindowSettings: typeof mock.adminSetWindowSettings = MOCK ? mock.adminSetWindowSettings : real.adminSetWindowSettings
export const getStatus: (host: HostKind) => Promise<PlatformStatus | null> = MOCK ? mock.getStatus : real.getStatus

export type {
  ApiResult,
  ContractAction,
  AdminUserAction,
  CustomerInput,
  SimulationInput,
  SimulationResult,
  PreviewInput,
  PreviewResult,
  IncomeResult,
  SessionView,
  AdminSession,
  HostStatus,
  ActivityItem,
  Snapshot,
  ContactInput,
} from './mock'
