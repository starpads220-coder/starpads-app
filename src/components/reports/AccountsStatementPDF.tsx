import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

export interface AccountsPdfRow {
  label: string;
  amount?: number;
  emphasis?: "total" | "grand";
}

export interface AccountsPdfSection {
  title: string;
  rows: AccountsPdfRow[];
}

interface AccountsStatementPDFProps {
  title: string;
  period: string;
  sections: AccountsPdfSection[];
}

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: "Helvetica", fontSize: 9, color: "#111827" },
  company: { fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { marginTop: 6, fontSize: 20, fontFamily: "Helvetica-Bold" },
  period: { marginTop: 5, paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: "#111827", color: "#4b5563" },
  section: { marginTop: 16 },
  sectionTitle: { padding: 7, backgroundColor: "#f3f4f6", fontFamily: "Helvetica-Bold", fontSize: 10 },
  row: { display: "flex", flexDirection: "row", minHeight: 24, paddingVertical: 6, paddingHorizontal: 7, borderBottomWidth: 0.5, borderBottomColor: "#d1d5db" },
  label: { flexGrow: 1, paddingRight: 12 },
  amount: { width: 150, textAlign: "right" },
  total: { fontFamily: "Helvetica-Bold", borderTopWidth: 1, borderTopColor: "#111827" },
  grand: { fontFamily: "Helvetica-Bold", borderTopWidth: 2, borderBottomWidth: 2, borderTopColor: "#111827", borderBottomColor: "#111827" },
  footer: { marginTop: 22, paddingTop: 8, borderTopWidth: 0.5, borderTopColor: "#9ca3af", color: "#6b7280", fontSize: 8 },
});

const currency = (amount: number) => `UGX ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function AccountsStatementPDF({ title, period, sections }: AccountsStatementPDFProps) {
  const rowCount = sections.reduce((total, section) => total + section.rows.length, 0);
  // A custom page height creates one continuous, pageless PDF. The PDF standard
  // permits pages up to 200 inches (14,400 points), which is ample for this report.
  const pageHeight = Math.min(14400, Math.max(842, 190 + sections.length * 36 + rowCount * 25));

  return <Document title={`${title} - ${period}`} author="Star Durable Pads">
    <Page size={[595.28, pageHeight]} style={styles.page} wrap={false}>
      <Text style={styles.company}>Star Durable Pads</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.period}>Reporting period: {period}  |  Currency: UGX</Text>
      {sections.map(section => <View key={section.title} style={styles.section} wrap={false}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        {section.rows.map((row, index) => <View key={`${row.label}-${index}`} style={[styles.row, row.emphasis === "total" ? styles.total : {}, row.emphasis === "grand" ? styles.grand : {}]}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={styles.amount}>{currency(row.amount ?? 0)}</Text>
        </View>)}
      </View>)}
      <Text style={styles.footer}>Generated from the Star Durable Pads financial accounts system.</Text>
    </Page>
  </Document>;
}
