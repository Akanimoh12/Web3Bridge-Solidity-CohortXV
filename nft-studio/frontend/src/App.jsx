import Header from './components/Header'
import EnsLookup from './components/EnsLookup'
import PricePanel from './components/PricePanel'
import CreateNftForm from './components/CreateNftForm'
import Gallery from './components/Gallery'
import { useClassNfts } from './hooks/useClassNfts'
import { useEthPrice } from './hooks/useEthPrice'
import './App.css'

function App() {
  const { nfts, loading, error, refresh } = useClassNfts()
  const ethPrice = useEthPrice()

  return (
    <div className="app">
      <Header />
      <main className="app__main">
        <div className="app__row app__row--split">
          <EnsLookup />
          <PricePanel ethPrice={ethPrice} />
        </div>
        <div className="app__row app__row--studio">
          <CreateNftForm onMinted={refresh} ethPrice={ethPrice} />
          <Gallery
            nfts={nfts}
            loading={loading}
            error={error}
            onRefresh={refresh}
          />
        </div>
      </main>
      <footer className="app__footer">
        <p>
          Day 3 NFT Studio assignment · Sepolia testnet · ENS, IPFS, and
          ClassNFT minting
        </p>
      </footer>
    </div>
  )
}

export default App
