import Link from "next/link";
import { ConnectButton } from "./ConnectButton";
import { PriceTicker } from "./PriceTicker";

const links = [
  ["/", "Studio"],
  ["/ens", "ENS lookup"],
  ["/nft", "Mint & gallery"],
  ["/aa", "Smart account"],
  ["/notifications", "Live alerts"],
];

export function Nav() {
  return (
    <header className="site-header">
      <div className="nav-main">
        <Link className="brand" href="/">
          <span className="brand-mark">W</span>
          <span>W3B <span className="brand-light">STUDIO</span></span>
        </Link>
        <nav className="nav-links" aria-label="Main navigation">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="nav-link">
              {label}
            </Link>
          ))}
        </nav>
        <PriceTicker />
        <ConnectButton />
      </div>
    </header>
  );
}
