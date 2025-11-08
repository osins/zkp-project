declare module 'snarkjs' {
    export namespace groth16 {
        interface Proof {
            pi_a: [string, string, string];
            pi_b: [[string, string], [string, string], [string, string]];
            pi_c: [string, string, string];
            protocol: string;
            curve: string;
        }

        interface FullProveResult {
            proof: Proof;
            publicSignals: string[];
        }

        function fullProve(input: any, wasmPath: string, zkeyPath: string): Promise<FullProveResult>;
        function verify(vkey: any, publicSignals: string[], proof: Proof): Promise<boolean>;
        function exportSolidityCallData(proof: Proof, publicSignals: string[]): Promise<string>;
    }

    export namespace wtns {
        function calculate(input: any, wasmPath: string, wtnsPath: string): Promise<void>;
    }
}