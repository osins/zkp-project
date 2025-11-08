export { ProverClient } from './proverClient';
export { VerifierClient } from './verifierClient';
export { ContractClient } from './contractClient';

export interface ProofData {
    proof: any;
    publicSignals: string[];
}

export interface CircuitInput {
    [key: string]: number | string | bigint;
}

export interface VerificationResult {
    verified: boolean;
    timestamp: number;
}
