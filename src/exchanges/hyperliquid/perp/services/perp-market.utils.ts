export function formatSymbol(symbol: string): string {
  return symbol.replace(/USDT|USDC|-PERP/gi, '');
}

export function formatSymbolResponse(coin: string): string {
  return `${coin}USDT`;
}
