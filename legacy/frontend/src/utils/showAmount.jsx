export const returnAmount = amount => {
  let result = amount - 0
  return amount >= 1000 ? `${result / 1000}k` : result
}
