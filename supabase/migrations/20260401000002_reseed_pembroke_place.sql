-- ============================================================================
-- INVESTMENT MODULE RESEED - Pembroke Place (from live on-chain / IPFS truth)
-- Run after database wipe to restore minimum viable investment baseline
-- Source: RWA_TOKEN uri(1) -> IPFS bafkreiguuviszr7lqnxfsivrbiqtoj3hunzc3d3lzpn6t2ujichjgw54qi
-- Source: Marketplace subgraph (37 txs, 2061 shares sold at 1 USDC each)
-- ============================================================================

-- 1. Pembroke Place (blockchain property 1)
INSERT INTO inv_properties (
  title, location, country, image, images, photos,
  price_per_share, total_shares, shares_sold,
  annual_yield, monthly_rent, property_value, rent_cost,
  status, type, bedrooms, bathrooms, area,
  description, highlights, documents,
  occupancy_rate, blockchain_property_id,
  financials
) VALUES (
  'Pembroke Place',
  'Liverpool, United Kingdom',
  'United Kingdom',
  'https://ipfs.io/ipfs/bafkreicobxluilcxpjy3ykl24x6zejszerb37aeutxitmz2tccaxy5goyy',
  ARRAY[
    'https://ipfs.io/ipfs/bafkreif442cy7otywhyai6e5maa2f32ckmfidlrekrr6zbrj3ulxrjnpja',
    'https://ipfs.io/ipfs/bafkreigtjc7dr3qgwapd2gzzv677bskfpkyi2okmynkhnywdqxkxs7xkl4',
    'https://ipfs.io/ipfs/bafkreihzqgasttxrcwvctowummvd3odd64fvkqsbdh433xx5qljzyqjgvy',
    'https://ipfs.io/ipfs/bafkreiacyiphz4l5zxj2jscj7yw7mynpf7rvekpbc6buq2hbhznjneg6pa',
    'https://ipfs.io/ipfs/bafkreidwe2fkinyantubdhhuuuwoxd7nhpsvph7ua565l3ttm36cme6xiq',
    'https://ipfs.io/ipfs/bafkreicl53jlopehawqfdrxxz2h3uotpqec67aedxzhubh3ok3weyyyb3m',
    'https://ipfs.io/ipfs/bafkreidqlm2v4bkgf4kiynyof2c3iy6bdhvvdpf2vx4pczsnoq7btcccxi',
    'https://ipfs.io/ipfs/bafkreig3qa2zq55tghjt3klgwymtnac5rxw76owpmltdvkpafxh6lwk6mu',
    'https://ipfs.io/ipfs/bafkreihd2cqrkptsl3z3zusati5wouzrzqayfn4uswl25ddu4rz36zwcs4',
    'https://ipfs.io/ipfs/bafkreifd726l3vxokyqbt4pbgmd23ezk4pc3ikrdngkb433gtnyrejhete',
    'https://ipfs.io/ipfs/bafkreibe5z5g47rlfeflmrxbyl5cxcrvjqrrr5aydevqawmtzgdngic5cy',
    'https://ipfs.io/ipfs/bafkreie3u3dlip7q6x4lddla47notfb7nfuwswxt7yszs4gjia7edmetqi',
    'https://ipfs.io/ipfs/bafkreifebem4hqwsdt4henaps5tyxfzxlz6ayvvbpktuks6orahrocbfia',
    'https://ipfs.io/ipfs/bafkreifaln73irjex4dfjwtktpyibbq2pkpcotw4cbtgxvtsc7lw3cuqau',
    'https://ipfs.io/ipfs/bafkreigsbd3ahehmf2ggwxyvf4o7latdhgmkzfpguuhi5wg6krnka3g4m4',
    'https://ipfs.io/ipfs/bafkreieih5vt76xrd36mgfxv7lzbxyqvkymfzckdz7ahxyy65ppqyvzhoq',
    'https://ipfs.io/ipfs/bafkreif2qowaz777v2odkwzjw7utyl7zb2sk4fynv64cqnlrqdjgkkuv5e',
    'https://ipfs.io/ipfs/bafkreihz3zmjmtfidqaerebjfkpuedq6otze4ahnrxfnbyhxviysezze6i',
    'https://ipfs.io/ipfs/bafkreifxfqt6otx6bc2erxp4nkju4eygezwmpoyuvixzxh7bttvo3vs5be',
    'https://ipfs.io/ipfs/bafkreignwkp3xp3dsvmtewo3dvsgsylz22u4erpxbvu2xp7alim5keuggu',
    'https://ipfs.io/ipfs/bafkreifey27ncyjl4vdlyge2pxc5x3gzawi565nqonappctewgredzccnu',
    'https://ipfs.io/ipfs/bafkreifal6drlsdumvrdyz4lb7qurfh2dlif6xovnhn3yaq6bm4htgbcde',
    'https://ipfs.io/ipfs/bafkreiefsvq3kqn74bmbhje4pf25c5vhhri2yhg4syw25tke37up65rplm',
    'https://ipfs.io/ipfs/bafkreiaiuk6lf4fgbvasscesveotchrtr6k2vuzirnftzapnznav2ag47i',
    'https://ipfs.io/ipfs/bafkreich5e2jwk2jbtoniwt4pjanja3mn6lghqurggu5pwpda3x7krh77a',
    'https://ipfs.io/ipfs/bafkreidcrx4qhf2iuipq5ndhvkgssmghbn46u4mmab6fbpgtrsohgyiv3q',
    'https://ipfs.io/ipfs/bafkreibmvppy4kmfdzjnoc5dtc3tc2mkftan7ttau4uxkym4lphvhsirmy',
    'https://ipfs.io/ipfs/bafkreidi4sir3d3ncyce6vruo56yms4wrm4dah3wwrcuwfoelqbxuwza4a',
    'https://ipfs.io/ipfs/bafkreicyip4zjuuytmvj3owga7h4liay4em6fb57safvoorlqm2rnq3biq',
    'https://ipfs.io/ipfs/bafkreidv5gwyekqm4i7h25y5jua6vsjd27534yrs4p5d222rs5jdobgax4',
    'https://ipfs.io/ipfs/bafkreiferopvcebvvv2pnbcai6no6asxgwhp3rvvpra6hrlrffis623ynq',
    'https://ipfs.io/ipfs/bafkreihd4b573e7zcjhzrvapkbv5flyyubp2w3yavjirvf6ujbm3m4wwte',
    'https://ipfs.io/ipfs/bafkreicc34hqenhozfidko4dszzdj5lwbul3t7urwi4ndy556raoy7ix6a',
    'https://ipfs.io/ipfs/bafkreiesxmj3eqdglwkdkc4mpscijlasappmlrtgs6h3klf3gm2fo6gqie'
  ],
  ARRAY[
    'https://ipfs.io/ipfs/bafkreicobxluilcxpjy3ykl24x6zejszerb37aeutxitmz2tccaxy5goyy',
    'https://ipfs.io/ipfs/bafkreif442cy7otywhyai6e5maa2f32ckmfidlrekrr6zbrj3ulxrjnpja',
    'https://ipfs.io/ipfs/bafkreigtjc7dr3qgwapd2gzzv677bskfpkyi2okmynkhnywdqxkxs7xkl4',
    'https://ipfs.io/ipfs/bafkreihzqgasttxrcwvctowummvd3odd64fvkqsbdh433xx5qljzyqjgvy',
    'https://ipfs.io/ipfs/bafkreiacyiphz4l5zxj2jscj7yw7mynpf7rvekpbc6buq2hbhznjneg6pa',
    'https://ipfs.io/ipfs/bafkreidwe2fkinyantubdhhuuuwoxd7nhpsvph7ua565l3ttm36cme6xiq'
  ],
  1,
  52317,
  2061,
  8.3,
  8400,
  52317,
  4400,
  'open',
  'HMO House',
  15,
  NULL,
  360,
  'Superb 15 Bed HMO House - Liverpool City Centre',
  ARRAY['15-room HMO', 'Liverpool City Centre', 'Rent 2 Rent model', '80% occupancy target'],
  ARRAY['Investment Memorandum', 'Title Deed', 'Financial Projections'],
  80,
  1,
  '{
    "transaction": [
      {"description": "Deal Price", "amount": "52,317 USD", "calculation_basis": "Total deal cost including fees in USD"},
      {"description": "First Months Rent", "amount": "3,500 GBP", "calculation_basis": "Rent paid in advance"},
      {"description": "Security Deposit", "amount": "3,500 GBP", "calculation_basis": "To be returned at the end of tenancy"},
      {"description": "Finders fee", "amount": "13,000 GBP", "calculation_basis": "Fee charged by NFsTay to find profitable deals"},
      {"description": "Refurbishment", "amount": "11,000 GBP", "calculation_basis": "Painting, flooring, 3 x partitions"},
      {"description": "Furniture", "amount": "4,447.50 GBP", "calculation_basis": "Beds, mattresses, tvs, bed linen, towels, kitchen utensils, etc."},
      {"description": "Staging", "amount": "1,552.50 GBP", "calculation_basis": "Labour, interior styling, photoshoot, and decorative setup"},
      {"description": "Miscellaneous", "amount": "1,000 GBP", "calculation_basis": "Contingency"}
    ],
    "rental": [
      {"description": "Expected Gross Monthly Yield", "value": "22.1%", "calculation_basis": "Based on a rate of 700pcm per room with a 80% occupancy rate"},
      {"description": "Expected Gross Rent Per Month", "value": "8,400 GBP", "calculation_basis": "15 x 700 X 80%"},
      {"description": "Bills", "value": "4,400 USD", "calculation_basis": "Rent + Utilities & Council Tax"},
      {"description": "Platform Fee", "value": "10%", "calculation_basis": "10% of the gross revenue"},
      {"description": "Property Management Fee", "value": "0%", "calculation_basis": "For certain deals, fees will only be charged after breakeven"},
      {"description": "Expected Net Monthly Yield", "value": "8.3%", "calculation_basis": "Net Monthly Rental Income / Total investment Value excluding fees"}
    ]
  }'::jsonb
) ON CONFLICT DO NOTHING;

-- 2. Global commission defaults (required by inv-crypto-confirm and inv-samcart-webhook)
INSERT INTO aff_commission_settings (user_id, commission_type, rate) VALUES
  (NULL, 'subscription', 0.40),
  (NULL, 'investment_first', 0.05),
  (NULL, 'investment_recurring', 0.02)
ON CONFLICT DO NOTHING;
