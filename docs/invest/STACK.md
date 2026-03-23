# Investment Module - Tech Stack Reference

> All contract addresses, endpoints, tokens, wallets, and technical references for the investment module.

---

## Blockchain (BNB Chain Mainnet - Chain ID 56)

### Smart Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| RWA Marketplace | `0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128` | Primary/secondary share sales |
| RWA Token | `0xA588E7dC42a956cc6c412925dE99240cc329157b` | Fractionalized property token (ERC1155) |
| Voting | `0x5edd93fE27eD8A0e7242490193c996BaE01EB047` | Governance proposals + voting |
| Rent | `0x5880FABeafDD228f0d8bc70Ebb2bb79971100C89` | Rental income distribution |
| Booster | `0x9d5D6EeF995d24DEC8289613D6C8F946214B320b` | APR boosting mechanism |
| BuyLP | `0x3e6E0791683F003E963Df5357cfaA0Aaa733786f` | Liquidity pair purchasing |
| Farm | `0x3b937d513a3C5ebE5168E3fFdb6028AE6cc32115` | Staking/farming rewards |
| USDC | `0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d` | Stablecoin for payments |
| STAY Token | `0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0` | Platform ERC20 token |
| ROCK Token | `0x6D635dc4a2A54664B54dF6a63e5ee31D5b29CF6e` | Governance token |
| Router (PancakeSwap) | `0x10ED43C718714eb63d5aA57B78B54704E256024E` | DEX for swaps |
| Transak Contract | `0x4A598B7eC77b1562AD0dF7dc64a162695cE4c78A` | Fiat on-ramp |

### Key Wallets

| Role | Address |
|------|---------|
| Admin | `0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436` |
| Manager | `0x0a1CEfB07A9B81759ac131C14Bb9A57eDd2E244F` |
| Treasury | `0xE1F532A57Fd6a1d3af3Ec8E268249d6B6cEe3df6` |

### The Graph Subgraphs

| Subgraph | Endpoint |
|----------|----------|
| Marketplace | `https://api.studio.thegraph.com/query/62641/nfstay-rwa-marketplace/v3` |
| Voting | `https://api.studio.thegraph.com/query/62641/rwa_nfstay_voting_mainnet/v3` |
| Rent | `https://api.studio.thegraph.com/query/62641/nfstay-rwa-mainnet-rent/v3` |
| Booster | `https://api.studio.thegraph.com/query/113079/booster-mainnet/v2` |

### RPC Provider

| Provider | URL |
|----------|-----|
| Alchemy (BNB) | `https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T` |

### Wallet Connection

| Service | Details |
|---------|---------|
| Particle Network | projectId: `4f8aca10-0c7e-4617-bfff-7ccb5269f365`, clientKey: `cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D`, appId: `d80e484f-a690-4f0b-80a8-d1a1d0264b90` |

---

## External APIs

| Service | Purpose | Auth |
|---------|---------|------|
| CoinGecko | Token price feeds | API key: `CG-Dm77JnkKntWqUcF9AoaZskEL` |
| Firebase | Push notifications | Project: `nfstay-app-7cd7e` |
| SamCart | Legacy fiat payment processing | `SAMCART_API_KEY` env var |
| Veriff | KYC verification | `VERIFF_API_KEY`, `VERIFF_SECRET_KEY` |
| Transak | Fiat on-ramp SDK | Client-side |
| Wert | Fiat off-ramp SDK | Client-side |

---

## Revolut Business API

| Item | Value |
|------|-------|
| Production URL | `https://b2b.revolut.com/api/1.0` |
| Sandbox URL | `https://sandbox-b2b.revolut.com/api/1.0` |
| Auth | Bearer token (REVOLUT_API_KEY) |
| GBP Account ID | To be configured (REVOLUT_ACCOUNT_ID_GBP) |
| EUR Account ID | To be configured (REVOLUT_ACCOUNT_ID_EUR) |
| Webhook Secret | REVOLUT_WEBHOOK_SECRET |
| Webhook Endpoint | Supabase Edge Function: revolut-webhook |

---

## Environment Variables (Revolut)

| Variable | Description |
|----------|-------------|
| REVOLUT_API_KEY | Revolut Business API access token |
| REVOLUT_SANDBOX_API_KEY | Sandbox token for testing |
| REVOLUT_ACCOUNT_ID_GBP | Revolut GBP account UUID |
| REVOLUT_ACCOUNT_ID_EUR | Revolut EUR account UUID |
| REVOLUT_WEBHOOK_SECRET | HMAC secret for webhook verification |

---

## Frontend Stack (within marketplace10)

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + Vite + TypeScript |
| Styling | TailwindCSS + shadcn/ui |
| State | React Query + useState |
| Routing | React Router |
| Blockchain | ethers.js v5.7.2 (to be added) |
| Wallet | Particle Network ConnectKit (to be added) |
| Charts | CSS-based (no charting library) |

---

## Reference Codebase

The original blockchain app lives at:
`/Users/hugo/Downloads/AI Folder/openclaw/nfstay-org/`

Key reference files:
- `frontend/src/context/nfstayContext.jsx` - all contract interaction functions
- `frontend/src/context/subgraphHelper.js` - all Graph queries
- `frontend/src/config.js` - all addresses + endpoints
- `frontend/src/utils/abis.js` - all contract ABIs
- `backend/routes/samcartRoute.js` - webhook + share distribution
