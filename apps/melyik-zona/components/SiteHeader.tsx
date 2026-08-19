import Link from "next/link";

export default function SiteHeader() {
  return (
    <header className="topbar">
      <div className="wrap">
        <Link href="/" className="logo">
          <span className="psign" aria-hidden>
            P
          </span>
          Melyik Zóna?
        </Link>
        <nav className="topnav">
          <Link href="/#hogyan">Hogyan működik</Link>
          <Link href="/lefedettseg">Lefedettség</Link>
          <Link href="/#gyik">GYIK</Link>
        </nav>
      </div>
    </header>
  );
}
