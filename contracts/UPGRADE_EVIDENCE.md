# Web3Bridge Diamond Upgrade Assignment

Network: Ethereum Sepolia (11155111)

Original Diamond:
0xA404260241D29A17B170f6F965fBe753C1a57618

Original deployment transaction:
0xfa6d70784861e865fda0c29614701e796a61d4cfc720729c17e6c22dccee3014

## Implemented

- Add: Register EmergencyFacet V1
- Replace: Upgrade emergencyWithdraw to EmergencyFacet V2
- Remove: Remove emergencyWithdraw selector
- Restore: Add EmergencyFacet V2 selector again

## Emergency withdrawal

- 10% penalty on requested withdrawal
- 90% payout to user
- Fee sent to diamond owner
- Supports early and partial withdrawals
- Reuses existing vault storage
- Uses the shared reentrancy guard
- Preserves the existing Diamond address

## Deployment evidence

Add the transaction hashes from the successful
UpgradeEmergency broadcast here before submission.

## Upgrade transaction order

1. Deploy EmergencyFacet V1
2. Add emergencyWithdraw selector
3. Deploy EmergencyFacet V2
4. Replace selector with V2
5. Remove selector
6. Restore selector to V2

## Transaction receipts

| Number | Transaction hash | Receipt status |
| --- | --- | --- |
| 1 | 0x1a650bdda04f40959d0a8c4ad62611f2651c40c20ddacc6d9d5a4085290ea3e2 | 0x1 |
| 2 | 0xc33ae4ea4ad09fe4738190305078a3e4509d4e3e9282c28bd798b63a3a843a3a | 0x1 |
| 3 | 0xa2be46ac70cc8a0131f32c6ae705e032bac93d5cdf76ec441fa88099f8f5d624 | 0x1 |
| 4 | 0xd652ab16398b1c409842924ac788a9bb5d01ace7eabecf55a8cf5678f7377144 | 0x1 |
| 5 | 0xcf0c35325ffa80ead822f13f421d8749196888eaca92b299ea33d5e140784f79 | 0x1 |
| 6 | 0x9b3a5b3fc723523144a84fe1521ee20ce6ca880ad1a827beeec474400dc5cf9f | 0x1 |
