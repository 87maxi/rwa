//! Tests for event structures

#[cfg(test)]
mod tests {
    use super::*;
    use crate::events::*;
    use anchor_lang::prelude::Pubkey;

    // =================================================================
    // Event Structure Tests
    // =================================================================

    #[test]
    fn test_owner_transferred_event() {
        let old_owner = Pubkey::new_unique();
        let new_owner = Pubkey::new_unique();
        let transferred_by = Pubkey::new_unique();

        let event = OwnerTransferredEvent {
            old_owner,
            new_owner,
            transferred_by,
        };

        assert_eq!(event.old_owner, old_owner);
        assert_eq!(event.new_owner, new_owner);
        assert_eq!(event.transferred_by, transferred_by);
    }

    #[test]
    fn test_tokens_minted_event() {
        let to = Pubkey::new_unique();
        let amount = 1_000_000u64;
        let total_supply = 2_000_000u64;
        let minted_by = Pubkey::new_unique();

        let event = TokensMintedEvent {
            to,
            amount,
            total_supply,
            minted_by,
        };

        assert_eq!(event.to, to);
        assert_eq!(event.amount, amount);
        assert_eq!(event.total_supply, total_supply);
        assert_eq!(event.minted_by, minted_by);
    }

    #[test]
    fn test_account_frozen_event() {
        let account = Pubkey::new_unique();
        let frozen_by = Pubkey::new_unique();

        let event = AccountFrozenEvent {
            account,
            frozen_by,
        };

        assert_eq!(event.account, account);
        assert_eq!(event.frozen_by, frozen_by);
    }

    #[test]
    fn test_account_unfrozen_event() {
        let account = Pubkey::new_unique();
        let unfrozen_by = Pubkey::new_unique();

        let event = AccountUnfrozenEvent {
            account,
            unfrozen_by,
        };

        assert_eq!(event.account, account);
        assert_eq!(event.unfrozen_by, unfrozen_by);
    }

    #[test]
    fn test_freeze_authority_transferred_event() {
        let old_freeze_authority = Pubkey::new_unique();
        let new_freeze_authority = Pubkey::new_unique();
        let transferred_by = Pubkey::new_unique();

        let event = FreezeAuthorityTransferredEvent {
            old_freeze_authority,
            new_freeze_authority,
            transferred_by,
        };

        assert_eq!(event.old_freeze_authority, old_freeze_authority);
        assert_eq!(event.new_freeze_authority, new_freeze_authority);
        assert_eq!(event.transferred_by, transferred_by);
    }
}
