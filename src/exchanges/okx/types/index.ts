export interface OkxApiCredentials {
  apiKey: string;
  apiSecret: string;
  passphrase: string;
}

export interface OkxApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  msg?: string;
}

// OKX specific types
export interface OkxOrderResponse {
  ordId: string;
  clOrdId: string;
  tag: string;
  sCode: string;
  sMsg: string;
}

export interface OkxPosition {
  instType: string;
  mgnMode: string;
  posId: string;
  posSide: string;
  pos: string;
  baseBal: string;
  quoteBal: string;
  posCcy: string;
  availPos: string;
  avgPx: string;
  upl: string;
  uplRatio: string;
  instId: string;
  lever: string;
  liqPx: string;
  markPx: string;
  imr: string;
  margin: string;
  mgnRatio: string;
  mmr: string;
  liab: string;
  liabCcy: string;
  interest: string;
  tradeId: string;
  optVal: string;
  notionalUsd: string;
  adl: string;
  ccy: string;
  last: string;
  usdPx: string;
  deltaBS: string;
  deltaPA: string;
  gammaBS: string;
  gammaPA: string;
  thetaBS: string;
  thetaPA: string;
  vegaBS: string;
  vegaPA: string;
  spotInUseAmt: string;
  spotInUseCcy: string;
  clSpotInUseAmt: string;
  maxSpotInUseAmt: string;
  bizRefId: string;
  bizRefType: string;
  cTime: string;
  uTime: string;
  pTime: string;
}

export interface OkxAccountBalance {
  uTime: string;
  totalEq: string;
  isoEq: string;
  adjEq: string;
  ordFroz: string;
  imr: string;
  mmr: string;
  mgnRatio: string;
  notionalUsd: string;
  upl: string;
  details: OkxBalanceDetail[];
}

export interface OkxBalanceDetail {
  ccy: string;
  eq: string;
  cashBal: string;
  upl: string;
  availBal: string;
  frozenBal: string;
  ordFrozen: string;
  liab: string;
  uTime: string;
  crossLiab: string;
  isoLiab: string;
  mgnRatio: string;
  interest: string;
  twap: string;
  maxLoan: string;
  eqUsd: string;
  notionalLever: string;
  stgyEq: string;
  isoUpl: string;
  availEq: string;
}

export interface OkxTicker {
  instType: string;
  instId: string;
  last: string;
  lastSz: string;
  askPx: string;
  askSz: string;
  bidPx: string;
  bidSz: string;
  open24h: string;
  high24h: string;
  low24h: string;
  volCcy24h: string;
  vol24h: string;
  ts: string;
  sodUtc0: string;
  sodUtc8: string;
}
