
import Link from "next/link";
import NotificationBell from "@/components/NotificationBell";

export default function Home() {
  return (
    <main style={styles.page}>
      <nav style={styles.navbar}>
        <Link href="/" style={styles.logo}>
          🛡️ TrustRoute
        </Link>

        <div style={styles.navLinks}>
          <Link href="/reports" style={styles.link}>
            Reports
          </Link>

          <Link href="/submit" style={styles.link}>
            Submit Report
          </Link>

          <Link href="/audit" style={styles.link}>
            Audit Log
          </Link>

          <NotificationBell />
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.badge}>COMMUNITY INCIDENT REPORTING</div>

        <h1 style={styles.heading}>
          Reliable information.
          <br />
          <span style={styles.highlight}>Safer communities.</span>
        </h1>

        <p style={styles.description}>
          TrustRoute helps you report incidents, review available evidence,
          track updates, and make informed decisions using a single dashboard.
        </p>

        <div style={styles.buttons}>
          <Link href="/submit" style={styles.primaryButton}>
            + Submit an Incident
          </Link>

          <Link href="/reports" style={styles.secondaryButton}>
            View All Reports →
          </Link>
        </div>
      </section>

      <section style={styles.cards}>
        <Link href="/reports" style={styles.card}>
          <div style={styles.icon}>📋</div>
          <h2 style={styles.cardTitle}>Incident Reports</h2>
          <p style={styles.cardText}>
            Browse submitted incidents and check their current status.
          </p>
          <span style={styles.cardLink}>Explore reports →</span>
        </Link>

        <Link href="/submit" style={styles.card}>
          <div style={styles.icon}>📍</div>
          <h2 style={styles.cardTitle}>Submit a Report</h2>
          <p style={styles.cardText}>
            Share incident details, location, observation time, and evidence.
          </p>
          <span style={styles.cardLink}>Create report →</span>
        </Link>

        <Link href="/audit" style={styles.card}>
          <div style={styles.icon}>🕒</div>
          <h2 style={styles.cardTitle}>Audit History</h2>
          <p style={styles.cardText}>
            Review recorded actions and follow changes made to reports.
          </p>
          <span style={styles.cardLink}>View history →</span>
        </Link>
      </section>

      <footer style={styles.footer}>
        TrustRoute · Incident reporting and review platform
      </footer>
    </main>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  navbar: {
    minHeight: "76px",
    padding: "16px 7%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    background: "#ffffff",
    borderBottom: "1px solid #e5eaf2",
  },
  logo: {
    color: "#1456d9",
    fontSize: "25px",
    fontWeight: "800",
    textDecoration: "none",
  },
  navLinks: {
    display: "flex",
    flexWrap: "wrap",
    gap: "24px",
  },
  link: {
    color: "#344054",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "600",
  },
  hero: {
    padding: "90px 20px 65px",
    textAlign: "center",
    maxWidth: "850px",
    margin: "0 auto",
  },
  badge: {
    display: "inline-block",
    background: "#e3edff",
    color: "#1456d9",
    padding: "9px 14px",
    borderRadius: "30px",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "1px",
  },
  heading: {
    fontSize: "clamp(38px, 6vw, 62px)",
    lineHeight: "1.12",
    letterSpacing: "-2px",
    margin: "25px 0 18px",
    fontWeight: "800",
  },
  highlight: {
    color: "#1456d9",
  },
  description: {
    maxWidth: "650px",
    margin: "0 auto",
    color: "#667085",
    fontSize: "17px",
    lineHeight: "1.8",
  },
  buttons: {
    display: "flex",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: "14px",
    marginTop: "32px",
  },
  primaryButton: {
    background: "#1456d9",
    color: "#ffffff",
    padding: "15px 22px",
    borderRadius: "9px",
    textDecoration: "none",
    fontWeight: "700",
  },
  secondaryButton: {
    background: "#ffffff",
    color: "#172033",
    padding: "15px 22px",
    border: "1px solid #d9e0eb",
    borderRadius: "9px",
    textDecoration: "none",
    fontWeight: "700",
  },
  cards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "22px",
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "10px 24px 65px",
  },
  card: {
    background: "#ffffff",
    padding: "28px",
    border: "1px solid #e5eaf2",
    borderRadius: "16px",
    textDecoration: "none",
    color: "#172033",
    boxShadow: "0 5px 20px rgba(20, 40, 80, 0.04)",
  },
  icon: {
    fontSize: "30px",
    marginBottom: "18px",
  },
  cardTitle: {
    fontSize: "20px",
    margin: "0 0 12px",
  },
  cardText: {
    color: "#667085",
    fontSize: "14px",
    lineHeight: "1.8",
    minHeight: "75px",
  },
  cardLink: {
    display: "inline-block",
    marginTop: "12px",
    color: "#1456d9",
    fontWeight: "700",
    fontSize: "14px",
  },
  footer: {
    padding: "24px",
    textAlign: "center",
    borderTop: "1px solid #e5eaf2",
    color: "#667085",
    fontSize: "13px",
  },
};
