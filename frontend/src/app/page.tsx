import Link from "next/link";

const steps = [
  { number: "01", title: "Create", text: "Give your piece a name, a story, and an image." },
  { number: "02", title: "Store", text: "Your artwork and metadata are pinned to IPFS." },
  { number: "03", title: "Mint", text: "Make it yours on Sepolia. Your reference value stays live." },
];

export default function Home() {
  return (
    <>
      <section className="hero shell">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-line" />A little art. A little onchain.</p>
          <h1>Make something<br /><span>that stays.</span></h1>
          <p className="hero-description">
            Turn a moment into an NFT. Your image lives on IPFS, your ownership is on Sepolia,
            and its reference value moves with the live ETH price.
          </p>
          <div className="hero-actions">
            <Link className="button button-dark" href="/nft">Start creating <span aria-hidden="true">↗</span></Link>
            <Link className="button button-light" href="/ens">Explore ENS <span aria-hidden="true">→</span></Link>
          </div>
          <div className="hero-meta">
            <span><i className="status-dot" /> Sepolia testnet</span>
            <span>Onchain, not in a feed.</span>
          </div>
        </div>
        <div className="hero-art" aria-label="Colorful abstract digital artwork">
          <div className="art-backdrop">
            <div className="art-orbit orbit-one" />
            <div className="art-orbit orbit-two" />
            <div className="art-orb" />
            <div className="art-sun" />
            <div className="art-card">
              <span className="art-card-label">STUDIO STUDY / 001</span>
              <span className="art-card-title">A soft<br />kind of<br />forever.</span>
              <span className="art-card-footer">IPFS · SEPOLIA · 2026</span>
            </div>
          </div>
          <div className="art-caption"><span>FIG. 01</span><span>Made for the long run</span></div>
        </div>
      </section>

      <section className="how-section">
        <div className="shell">
          <div className="section-heading">
            <p className="eyebrow">THE STUDIO PROCESS</p>
            <p className="section-note">No jargon. Just three small steps.</p>
          </div>
          <div className="step-grid">
            {steps.map((step) => (
              <article className="step-card" key={step.number}>
                <span className="step-number">{step.number}</span>
                <h2>{step.title}</h2>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="explore-section shell">
        <div>
          <p className="eyebrow">YOUR NEXT MOVE</p>
          <h2>Give your work<br />a place to live.</h2>
        </div>
        <Link className="button button-dark" href="/nft">Open the studio <span aria-hidden="true">↗</span></Link>
      </section>

      <footer className="site-footer shell">
        <span>W3B STUDIO</span><span>Built on Sepolia · Powered by IPFS</span>
      </footer>
    </>
  );
}
