import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { ApiPromise, WsProvider } from '@polkadot/api';

interface ApiContextValue {
  api: ApiPromise | null;
  ready: boolean;
  decimals: number | null;
  token: string;
  existentialDeposit: bigint | null;
}

const ApiContext = createContext<ApiContextValue>({
  api: null,
  ready: false,
  decimals: null,
  token: '',
  existentialDeposit: null,
});

export const ApiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [decimals, setDecimals] = useState<number | null>(null);
  const [token, setToken] = useState<string>('');
  const [existentialDeposit, setExistentialDeposit] = useState<bigint | null>(null);
  const connectingRef = useRef<boolean>(false);

  useEffect(() => {
    const connect = async () => {
      if (connectingRef.current) return;
      connectingRef.current = true;
      try {
        const wsProvider = new WsProvider('wss://westend-rpc.polkadot.io');
        const instance = await ApiPromise.create({ provider: wsProvider });
        await instance.isReady;
        setApi(instance);
        setReady(true);

        const dec = instance.registry.chainDecimals[0];
        const sym = instance.registry.chainTokens[0];
        setDecimals(dec);
        setToken(sym);

        const edConst = instance.consts.balances.existentialDeposit;
        setExistentialDeposit(BigInt(edConst.toString()));
      } catch (e) {
        console.error('API connect error', e);
        setReady(false);
      }
    };

    connect();

    return () => {
      (async () => {
        try { await api?.disconnect(); } catch {}
      })();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => ({ api, ready, decimals, token, existentialDeposit }), [api, ready, decimals, token, existentialDeposit]);

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
};

export const useApi = (): ApiContextValue => useContext(ApiContext);