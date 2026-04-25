# TXTX Implementation Analysis & Fix

## Executive Summary

The Surfpool SVM addon panic error was caused by **runbook file organization issues**. When running `surfpool run deployment`, Surfpool loads ALL `.tx` files from the `runbooks/deployment/` directory as a single runbook. The `setup-surfnet.tx` and `upgrade.tx` files contained actions that referenced empty input variables (like `input.solana_rwa_program_id` which is `""`), causing the SVM addon to panic when trying to slice 32 bytes from an empty string.

## Root Cause Analysis

### The Panic Error
```
thread 'main' panicked at /txtx-addon-network-svm-types-0.3.18/src/lib.rs:425:46:
range end index 32 out of range for slice of length 0
```

### Cause Chain
1. **File Loading**: `surfpool run deployment` loads all `.tx` files from `./runbooks/deployment/`:
   - `main.tx` - Deployment actions (deploy + initialize programs)
   - `setup-surfnet.tx` - Localnet setup (balances, token accounts, program authorities)
   - `upgrade.tx` - Program upgrade actions
   - `signers.localnet.tx` - Signer definitions

2. **Empty Input Resolution**: `setup-surfnet.tx` contains actions like:
   ```txtx
   action "set_program_authorities" "svm::setup_surfnet" {
       set_program_authority {
           program_id = input.solana_rwa_program_id  // This is "" (empty string)!
           ...
       }
   }
   ```

3. **SVM Addon Panic**: When the SVM addon tries to process the empty `program_id` as a 32-byte Solana pubkey, it attempts to slice 32 bytes from a 0-length string, causing the panic.

### Why This Happened

The original design assumed that runbook files in the same directory would be:
- Loaded together as a single runbook
- Share addon configuration via comments (e.g., "addon 'svm' is configured in main.tx")

However, Surfpool executes ALL actions from ALL files in the directory, regardless of whether the inputs are valid for that specific action.

## Solution

### File Restructuring

Moved runbook files to separate directories based on their purpose:

```
runbooks/
├── deployment/           # Main deployment runbook
│   ├── main.tx          # Deploy + initialize programs
│   └── signers.*.tx     # Environment-specific signers
├── setup-surfnet/       # Localnet setup (separate runbook)
│   └── setup-surfnet.tx
├── upgrade/             # Program upgrades (separate runbook)
│   └── upgrade.tx
└── token-operations/    # Token operations (separate runbook)
    └── token-operations.tx
```

### Key Changes

1. **`runbooks/deployment/main.tx`**: Contains ONLY deployment actions (deploy + initialize programs)
   - Has `addon "svm"` block
   - Has signer definitions
   - Actions: `deploy_compliance_aggregator`, `deploy_identity_registry`, `deploy_solana_rwa`, `init_*` actions

2. **`runbooks/deployment/signers.*.tx`**: Environment-specific signer definitions
   - `signers.localnet.tx` - Uses secret key for localnet
   - `signers.devnet.tx` - Uses web wallet for devnet
   - `signers.mainnet.tx` - Uses web wallet/multisig for mainnet

3. **`runbooks/setup-surfnet/setup-surfnet.tx`**: Localnet setup actions
   - Has its own `addon "svm"` block
   - Has its own signer definitions
   - Actions: `setup_payer_balance`, `setup_usdc_token_account`, `set_program_authorities`

4. **`runbooks/upgrade/upgrade.tx`**: Program upgrade actions
   - Has its own `addon "svm"` block
   - Has its own signer definitions
   - Actions: `upgrade_compliance_aggregator`, `upgrade_identity_registry`, `upgrade_solana_rwa`

5. **`runbooks/token-operations/token-operations.tx`**: Token operations
   - Has its own `addon "svm"` block
   - Has its own signer definitions
   - Actions: `mint_tokens`, `transfer_tokens`, `add_agent`, `remove_agent`, `freeze_account`, `unfreeze_account`

### Updated txtx.yml

```yaml
runbooks:
  - name: deployment
    location: ./runbooks/deployment
    state:
      location: .surfpool/state

  - name: setup-surfnet
    location: ./runbooks/setup-surfnet

  - name: upgrade
    location: ./runbooks/upgrade

  - name: token-operations
    location: ./runbooks/token-operations
```

## Usage

### Running Deployment (Fixed)
```bash
# This now only loads main.tx and signers.localnet.tx
surfpool run deployment --env localnet -u
```

### Running Setup Surfnet
```bash
# This loads setup-surfnet/setup-surfnet.tx
surfpool run setup-surfnet --env localnet -u
```

### Running Upgrade
```bash
# This loads upgrade/upgrade.tx
surfpool run upgrade --env localnet -u
```

### Running Token Operations
```bash
# This loads token-operations/token-operations.tx
surfpool run token-operations --env localnet -u
```

## Important Notes

### Addon Declaration Rule

Each runbook directory MUST have its own `addon "svm"` block. Comments like "addon 'svm' is configured in main.tx" do NOT share addon configuration between runbooks.

```txtx
// This MUST be in EACH runbook file that uses SVM actions
addon "svm" {
    rpc_api_url = input.rpc_api_url
    network_id = input.network_id
}
```

### Empty Input Handling

Actions that reference inputs which may be empty should NOT be part of the deployment runbook. The `setup-surfnet` runbook references `input.solana_rwa_program_id` which is empty before deployment - this must be a separate runbook that runs AFTER deployment.

### Signer Definitions

Each standalone runbook should define its own signers. The signers in `runbooks/deployment/signers.*.tx` are loaded automatically based on the environment, but standalone runbooks need their own signer definitions.

## Verification Checklist

- [x] `runbooks/deployment/` contains only `main.tx` and `signers.*.tx`
- [x] Each standalone runbook has its own `addon "svm"` block
- [x] Each standalone runbook has its own signer definitions
- [x] `txtx.yml` points to correct directories
- [x] No runbook file references empty inputs during deployment

## Previous Issues (Fixed)

### Issue 1: Duplicate Key Errors
**Error**: `duplicate key 'rpc_api_url' in 'svm' addon defaults`
**Cause**: Multiple runbook files defining the same addon fields
**Fix**: Each runbook directory has its own `addon "svm"` block, no duplication within the same runbook

### Issue 2: Unknown Addon Error
**Error**: `unable to instantiate construct, addon 'svm' unknown`
**Cause**: Completely removing addon blocks
**Fix**: Each runbook file that uses SVM actions must declare the addon

### Issue 3: Variable Resolution Errors
**Error**: `unable to resolve 'variable.solana_rwa_idl_data'`
**Cause**: Referencing non-existent variables
**Fix**: Use proper variable references that exist in the runbook context

### Issue 4: SVM Addon Panic (Current Fix)
**Error**: `range end index 32 out of range for slice of length 0`
**Cause**: Actions with empty inputs loaded as part of deployment runbook
**Fix**: Separate runbooks into independent directories

## References

- [Surfpool SVM Documentation](https://docs.surfpool.run/iac/svm/overview)
- [TXTX Language Syntax](https://docs.surfpool.run/iac/language)
- [Surfpool CLI Reference](https://docs.surfpool.run/toolchain/cli)
