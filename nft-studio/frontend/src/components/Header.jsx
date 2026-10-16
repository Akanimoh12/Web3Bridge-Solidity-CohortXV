import { useWallet } from '../hooks/useWallet'
import { useEnsName } from '../hooks/useEnsName'
import { formatEth, truncateAddress } from '../lib/format'
import Notice from './Notice'

export default function Header() {
  const {
    account,
    balance,
    chainId,
    connecting,
    notice,
    clearNotice,
    connect,
    disconnect,
    switchToSepolia,
    isSepolia,
    networkLabel,
  } = useWallet()
  const ensName = useEnsName(account)
  const connected = Boolean(account)
  const wrongNetwork = connected && !isSepolia

  return (
    <header className="header">
      <div className="header__brand">
        <span className="header__mark" aria-hidden="true">
          <svg
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M12 2.5 L20.5 7.25 V16.75 L12 21.5 L3.5 16.75 V7.25 Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path
              d="M12 7.5 L16.25 9.9 V14.6 L12 17 L7.75 14.6 V9.9 Z"
              fill="currentColor"
              opacity="0.4"
            />
          </svg>
        </span>
        <div className="header__text">
          <h1 className="header__title">NFT Studio</h1>
          <p className="header__tagline">Create, pin, and mint on Sepolia</p>
        </div>
      </div>

      <div className="header__actions">
        {connected ? (
          <>
            <div className="wallet-summary">
              <span
                className="wallet-chip wallet-chip--connected"
                title={account}
              >
                {ensName ?? truncateAddress(account)}
              </span>
              <span className="wallet-balance">
                {balance == null ? 'Balance —' : `Balance ${formatEth(balance)}`}
              </span>
            </div>
            <span
              className={`badge ${isSepolia ? 'badge--success' : 'badge--warning'}`}
            >
              {networkLabel}
              {!isSepolia && chainId ? ` (switch required)` : ''}
            </span>
            {wrongNetwork && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={switchToSepolia}
              >
                Switch to Sepolia
              </button>
            )}
            <button type="button" className="btn" onClick={disconnect}>
              Disconnect
            </button>
          </>
        ) : (
          <span className="wallet-chip">Wallet not connected</span>
        )}
        {!connected && (
          <button
            type="button"
            className="btn btn--primary"
            onClick={connect}
            disabled={connecting}
          >
            {connecting ? 'Connecting…' : 'Connect Wallet'}
          </button>
        )}
      </div>

      {wrongNetwork && (
        <div className="header__notice">
          <Notice tone="warning">
            Your wallet is on {networkLabel}. NFT transactions on this app only
            work on Sepolia — nothing will be sent until you switch networks.
          </Notice>
        </div>
      )}

      {notice && (
        <div className="header__notice">
          <Notice tone={notice.tone} onDismiss={clearNotice}>
            {notice.message}
          </Notice>
        </div>
      )}
    </header>
  )
}
