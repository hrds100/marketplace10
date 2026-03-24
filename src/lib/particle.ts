// Particle Network configuration for nfstay Investment module
//
// TWO PROJECTS:
//   LEGACY — social login (Google/Apple/Twitter/Facebook). Same project as app.nfstay.com.
//            Google account → same wallet returned (0xAA884...). Used for all OAuth flows.
//   HUB    — JWT auth only. JWKS endpoint configured. Used for email/password signups.
//
// Rule: social login always uses PARTICLE_LEGACY_CONFIG so legacy wallets are recovered.

// Shared branding for all Particle popups
export const PARTICLE_CUSTOM_STYLE = {
  projectName: 'nfstay',
  subtitle: 'Verify your account to continue',
  logo: 'https://hub.nfstay.com/og-preview.png',
  modalBorderRadius: 16,
  primaryBtnBorderRadius: 10,
  theme: {
    light: {
      primaryBtnColor: '#ffffff',
      primaryBtnBackgroundColor: '#1E9A80',
      textColor: '#1A1A1A',
      secondaryTextColor: '#6B7280',
      themeBackgroundColor: '#ffffff',
      accentColor: '#1E9A80',
    },
  },
};

// Legacy project — social login (Google, Apple, Twitter, Facebook)
export const PARTICLE_LEGACY_CONFIG = {
  projectId: '4f8aca10-0c7e-4617-bfff-7ccb5269f365',
  clientKey: 'cWniBMIDt2lhrhdIERSBWURpannCk30SGNwdPK7D',
  appId: 'd80e484f-a690-4f0b-80a8-d1a1d0264b90',
};

// Hub project — JWT auth (email/password users)
export const PARTICLE_CONFIG = {
  projectId: '470629ca-91af-45fa-a52b-62ed2adf9ef0',
  clientKey: 'cTHFOA18eAs4iRrkgn8lG1QARC8HFkkv5jeYQPc1',
  appId: 'a82d525c-85da-4786-a0ed-e4cf110c8377',
  walletConnectProjectId: '28e91881cee345ca645f8ad85e4db6fe',
  chainId: 56, // BNB Chain mainnet
  chainName: 'BNB Smart Chain',
  rpcUrl: 'https://bnb-mainnet.g.alchemy.com/v2/cSfdT7vlZP9eG6Gn6HysdgrYaNXs9B6T',
};

// Contract addresses (BNB Chain mainnet)
export const CONTRACTS = {
  RWA_MARKETPLACE: '0xDD22fDC50062F49a460E5a6bADF96Cbec85ac128',
  RWA_TOKEN: '0xA588E7dC42a956cc6c412925dE99240cc329157b',
  VOTING: '0x5edd93fE27eD8A0e7242490193c996BaE01EB047',
  RENT: '0x5880FABeafDD228f0d8bc70Ebb2bb79971100C89',
  BOOSTER: '0x9d5D6EeF995d24DEC8289613D6C8F946214B320b',
  BUY_LP: '0x3e6E0791683F003E963Df5357cfaA0Aaa733786f',
  FARM: '0x3b937d513a3C5ebE5168E3fFdb6028AE6cc32115',
  USDC: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
  STAY: '0x7F14ce2A5df31Ad0D2BF658d3840b1F7559d3EE0',
  ROUTER: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
  STAY_USDC_PAIR: '0x2397C1722CCb6934BECF579351685A56030EA8F7', // PancakeSwap LP pair
};

// Key wallets
export const WALLETS = {
  ADMIN: '0x6eb06e1078cfbdCF9a3387584a8D934D85Ea1436',
  MANAGER: '0x0a1CEfB07A9B81759ac131C14Bb9A57eDd2E244F',
  TREASURY: '0xE1F532A57Fd6a1d3af3Ec8E268249d6B6cEe3df6',
};

// The Graph subgraph endpoints
export const SUBGRAPHS = {
  MARKETPLACE: 'https://api.studio.thegraph.com/query/62641/nfstay-rwa-marketplace/v3',
  VOTING: 'https://api.studio.thegraph.com/query/62641/rwa_nfstay_voting_mainnet/v3',
  RENT: 'https://api.studio.thegraph.com/query/62641/nfstay-rwa-mainnet-rent/v3',
  BOOSTER: 'https://api.studio.thegraph.com/query/113079/booster-mainnet/v2',
};
