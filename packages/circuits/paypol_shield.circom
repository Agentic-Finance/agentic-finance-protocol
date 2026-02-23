pragma circom 2.0.0;

include "node_modules/circomlib/circuits/poseidon.circom";

template PayPolShield() {
    // Public inputs (Exposed on-chain)
    signal input commitment;
    signal input recipient;

    // Private inputs (Kept secret by the prover)
    signal input amount;
    signal input adminSecret;

    // Cryptographic constraint via Poseidon Hash
    // Ensures the commitment matches the underlying private data without revealing it
    component hasher = Poseidon(3);
    hasher.inputs[0] <== adminSecret;
    hasher.inputs[1] <== amount;
    hasher.inputs[2] <== recipient;

    commitment === hasher.out;
}

// Instantiate the main component
component main {public [commitment, recipient]} = PayPolShield();