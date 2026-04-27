//! Tests for constants

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::*;

    // =================================================================
    // Constants Tests
    // =================================================================

    #[test]
    fn test_max_name_length_constant() {
        assert_eq!(MAX_NAME_LENGTH, 32);
    }

    #[test]
    fn test_max_symbol_length_constant() {
        assert_eq!(MAX_SYMBOL_LENGTH, 10);
    }

    #[test]
    fn test_max_metadata_uri_length_constant() {
        assert_eq!(MAX_METADATA_URI_LENGTH, 256);
    }

    #[test]
    fn test_max_identity_data_length_constant() {
        assert_eq!(MAX_IDENTITY_DATA_LENGTH, 128);
    }
}
