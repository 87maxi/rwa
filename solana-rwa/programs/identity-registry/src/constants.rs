//! Global constants for the identity registry program

/// Maximum length for identity name (prevents excessive storage)
pub const MAX_NAME_LENGTH: usize = 32;

/// Maximum length for identity symbol
pub const MAX_SYMBOL_LENGTH: usize = 10;

/// Maximum length for metadata URI
pub const MAX_METADATA_URI_LENGTH: usize = 256;

/// Maximum length for identity data string
pub const MAX_IDENTITY_DATA_LENGTH: usize = 128;
