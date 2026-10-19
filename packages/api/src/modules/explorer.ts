import { Explorer } from "@skandha/executor/lib/modules";
import {
  AdmissionOutcome,
  AdmissionRecord,
  ExplorerInfo,
  ExplorerPeer,
  ExplorerReputationEntry,
  ExplorerTransactionDetail,
  ExplorerTransactionSummary,
  Page,
} from "@skandha/types/lib/explorer/index.js";

/** Thin wrapper over the executor's read-only `Explorer` module. */
export class ExplorerAPI {
  constructor(private explorer: Explorer) {}

  info(): ExplorerInfo {
    return this.explorer.info();
  }

  listTransactions(params?: {
    status?: string;
    cursor?: string;
    limit?: number;
  }): Promise<Page<ExplorerTransactionSummary>> {
    return this.explorer.listTransactions(params ?? {});
  }

  listAdmissions(params?: {
    outcome?: AdmissionOutcome;
    cursor?: string;
    limit?: number;
  }): Page<AdmissionRecord> {
    return this.explorer.listAdmissions(params ?? {});
  }

  getTransaction(hash: string): Promise<ExplorerTransactionDetail> {
    return this.explorer.getTransaction(hash);
  }

  peers(): ExplorerPeer[] {
    return this.explorer.peers();
  }

  listReputation(params?: {
    cursor?: string;
    limit?: number;
  }): Promise<Page<ExplorerReputationEntry>> {
    return this.explorer.listReputation(params ?? {});
  }
}
