/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/solana_rwa.json`.
 */
export type SolanaRwa = {
  "address": "7URg5r88otZuAXX5a9ju8pauWUHLFSALdAvnjMRmcd3L",
  "metadata": {
    "name": "solanaRwa",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addAgent",
      "discriminator": [
        214,
        206,
        14,
        110,
        178,
        131,
        218,
        45
      ],
      "accounts": [
        {
          "name": "token",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "agent",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "burn",
      "discriminator": [
        116,
        110,
        29,
        56,
        107,
        219,
        42,
        93
      ],
      "accounts": [
        {
          "name": "token",
          "writable": true
        },
        {
          "name": "agent",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "from",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "freezeAccount",
      "discriminator": [
        253,
        75,
        82,
        133,
        167,
        238,
        43,
        130
      ],
      "accounts": [
        {
          "name": "token",
          "writable": true
        },
        {
          "name": "from",
          "signer": true
        },
        {
          "name": "to"
        }
      ],
      "args": [
        {
          "name": "account",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "token",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "name",
          "type": "string"
        },
        {
          "name": "symbol",
          "type": "string"
        },
        {
          "name": "decimals",
          "type": "u8"
        }
      ]
    },
    {
      "name": "mint",
      "discriminator": [
        51,
        57,
        225,
        47,
        182,
        146,
        137,
        166
      ],
      "accounts": [
        {
          "name": "token",
          "writable": true
        },
        {
          "name": "agent",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "to",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "removeAgent",
      "discriminator": [
        126,
        25,
        90,
        199,
        104,
        237,
        225,
        130
      ],
      "accounts": [
        {
          "name": "token",
          "writable": true
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "agent",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "transfer",
      "discriminator": [
        163,
        52,
        200,
        231,
        140,
        3,
        69,
        186
      ],
      "accounts": [
        {
          "name": "token",
          "writable": true
        },
        {
          "name": "from",
          "signer": true
        },
        {
          "name": "to"
        }
      ],
      "args": [
        {
          "name": "from",
          "type": "pubkey"
        },
        {
          "name": "to",
          "type": "pubkey"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "unfreezeAccount",
      "discriminator": [
        28,
        255,
        156,
        206,
        139,
        228,
        5,
        213
      ],
      "accounts": [
        {
          "name": "token",
          "writable": true
        },
        {
          "name": "from",
          "signer": true
        },
        {
          "name": "to"
        }
      ],
      "args": [
        {
          "name": "account",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "tokenState",
      "discriminator": [
        218,
        112,
        6,
        149,
        55,
        186,
        168,
        163
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "unauthorized"
    },
    {
      "code": 6001,
      "name": "insufficientBalance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6002,
      "name": "accountFrozen",
      "msg": "Account frozen"
    }
  ],
  "types": [
    {
      "name": "balanceEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": "pubkey"
          },
          {
            "name": "value",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "frozenEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "type": "pubkey"
          },
          {
            "name": "frozen",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "tokenState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "totalSupply",
            "type": "u64"
          },
          {
            "name": "nextIndex",
            "type": "u64"
          },
          {
            "name": "balances",
            "type": {
              "vec": {
                "defined": {
                  "name": "balanceEntry"
                }
              }
            }
          },
          {
            "name": "frozenAccounts",
            "type": {
              "vec": {
                "defined": {
                  "name": "frozenEntry"
                }
              }
            }
          },
          {
            "name": "agents",
            "type": {
              "vec": "pubkey"
            }
          },
          {
            "name": "complianceModules",
            "type": {
              "vec": "pubkey"
            }
          }
        ]
      }
    }
  ]
};
