-- ============================================================================
-- Pembroke Place: swap IPFS image URLs for Supabase Storage URLs
-- Why: ipfs.io public gateway is unreliable for many users (rate-limited,
-- blocked in some regions, slow). All 35 images were downloaded from ipfs.io
-- and re-uploaded to the public 'property-images' bucket under inv/pembroke-place/.
-- ============================================================================

UPDATE inv_properties
SET
  image = 'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreicobxluilcxpjy3ykl24x6zejszerb37aeutxitmz2tccaxy5goyy.jpeg',
  photos = ARRAY[
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreicobxluilcxpjy3ykl24x6zejszerb37aeutxitmz2tccaxy5goyy.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreif442cy7otywhyai6e5maa2f32ckmfidlrekrr6zbrj3ulxrjnpja.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreigtjc7dr3qgwapd2gzzv677bskfpkyi2okmynkhnywdqxkxs7xkl4.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreihzqgasttxrcwvctowummvd3odd64fvkqsbdh433xx5qljzyqjgvy.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreiacyiphz4l5zxj2jscj7yw7mynpf7rvekpbc6buq2hbhznjneg6pa.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreidwe2fkinyantubdhhuuuwoxd7nhpsvph7ua565l3ttm36cme6xiq.jpeg'
],
  images = ARRAY[
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreif442cy7otywhyai6e5maa2f32ckmfidlrekrr6zbrj3ulxrjnpja.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreigtjc7dr3qgwapd2gzzv677bskfpkyi2okmynkhnywdqxkxs7xkl4.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreihzqgasttxrcwvctowummvd3odd64fvkqsbdh433xx5qljzyqjgvy.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreiacyiphz4l5zxj2jscj7yw7mynpf7rvekpbc6buq2hbhznjneg6pa.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreidwe2fkinyantubdhhuuuwoxd7nhpsvph7ua565l3ttm36cme6xiq.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreicl53jlopehawqfdrxxz2h3uotpqec67aedxzhubh3ok3weyyyb3m.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreidqlm2v4bkgf4kiynyof2c3iy6bdhvvdpf2vx4pczsnoq7btcccxi.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreig3qa2zq55tghjt3klgwymtnac5rxw76owpmltdvkpafxh6lwk6mu.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreihd2cqrkptsl3z3zusati5wouzrzqayfn4uswl25ddu4rz36zwcs4.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreifd726l3vxokyqbt4pbgmd23ezk4pc3ikrdngkb433gtnyrejhete.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreibe5z5g47rlfeflmrxbyl5cxcrvjqrrr5aydevqawmtzgdngic5cy.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreie3u3dlip7q6x4lddla47notfb7nfuwswxt7yszs4gjia7edmetqi.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreifebem4hqwsdt4henaps5tyxfzxlz6ayvvbpktuks6orahrocbfia.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreifaln73irjex4dfjwtktpyibbq2pkpcotw4cbtgxvtsc7lw3cuqau.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreigsbd3ahehmf2ggwxyvf4o7latdhgmkzfpguuhi5wg6krnka3g4m4.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreieih5vt76xrd36mgfxv7lzbxyqvkymfzckdz7ahxyy65ppqyvzhoq.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreif2qowaz777v2odkwzjw7utyl7zb2sk4fynv64cqnlrqdjgkkuv5e.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreihz3zmjmtfidqaerebjfkpuedq6otze4ahnrxfnbyhxviysezze6i.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreifxfqt6otx6bc2erxp4nkju4eygezwmpoyuvixzxh7bttvo3vs5be.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreignwkp3xp3dsvmtewo3dvsgsylz22u4erpxbvu2xp7alim5keuggu.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreifey27ncyjl4vdlyge2pxc5x3gzawi565nqonappctewgredzccnu.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreifal6drlsdumvrdyz4lb7qurfh2dlif6xovnhn3yaq6bm4htgbcde.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreiefsvq3kqn74bmbhje4pf25c5vhhri2yhg4syw25tke37up65rplm.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreiaiuk6lf4fgbvasscesveotchrtr6k2vuzirnftzapnznav2ag47i.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreich5e2jwk2jbtoniwt4pjanja3mn6lghqurggu5pwpda3x7krh77a.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreidcrx4qhf2iuipq5ndhvkgssmghbn46u4mmab6fbpgtrsohgyiv3q.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreibmvppy4kmfdzjnoc5dtc3tc2mkftan7ttau4uxkym4lphvhsirmy.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreidi4sir3d3ncyce6vruo56yms4wrm4dah3wwrcuwfoelqbxuwza4a.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreicyip4zjuuytmvj3owga7h4liay4em6fb57safvoorlqm2rnq3biq.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreidv5gwyekqm4i7h25y5jua6vsjd27534yrs4p5d222rs5jdobgax4.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreiferopvcebvvv2pnbcai6no6asxgwhp3rvvpra6hrlrffis623ynq.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreihd4b573e7zcjhzrvapkbv5flyyubp2w3yavjirvf6ujbm3m4wwte.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreicc34hqenhozfidko4dszzdj5lwbul3t7urwi4ndy556raoy7ix6a.jpeg',
  'https://asazddtvjvmckouxcmmo.supabase.co/storage/v1/object/public/property-images/inv/pembroke-place/bafkreiesxmj3eqdglwkdkc4mpscijlasappmlrtgs6h3klf3gm2fo6gqie.jpeg'
]
WHERE id = 6;
